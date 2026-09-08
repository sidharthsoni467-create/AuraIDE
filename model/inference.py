import torch
import torch.nn.functional as F
import re
import os
import sys

# Ensure model_def can be found for torch.load if it needs it in __main__ or locally
sys.path.append(os.path.dirname(__file__))
from model_def import ResidualRecurrentModel
from vocab import load_vocab

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "training", "autocomplete_model.pt")

def simple_tokenize(code_text):
    # Added \n to the token list
    tokens = re.findall(r'[a-zA-Z_]\w*|\d+(?:\.\d+)?|==|!=|<=|>=|\/\/|\*\*|[-+*/=<>!&|~^%]|[\(\)\[\]\{\}\.,:;@\n]', code_text)
    return tokens

class ModelPredictor:
    def __init__(self, model_path=MODEL_PATH):
        self.vocab_list, self.token_to_id, self.id_to_token = load_vocab()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.unk_id = self.token_to_id.get("<UNK>", 1)
        self.pad_id = self.token_to_id.get("<PAD>", 0)
        
        try:
            import __main__
            setattr(__main__, 'ResidualRecurrentModel', ResidualRecurrentModel)
            self.model = torch.load(model_path, map_location=self.device, weights_only=False)
        except Exception as e:
            print(f"Failed to load model directly: {e}")
            raise e
            
        self.model.to(self.device)
        self.model.eval()
        
    def predict_next_token(self, code_text: str) -> str:
        tokens = simple_tokenize(code_text)
        if not tokens:
            return ""
            
        input_ids = [self.token_to_id.get(token, self.unk_id) for token in tokens[-999:]]
        input_tensor = torch.tensor([input_ids], dtype=torch.long).to(self.device)
        
        with torch.no_grad():
            outputs, _ = self.model(input_tensor)
            logits = outputs[0, -1, :]
            
            logits[self.unk_id] = -float('Inf')
            logits[self.pad_id] = -float('Inf')
            
            best_token_idx = torch.argmax(logits).item()
            best_token = self.id_to_token.get(best_token_idx, "")
            
            if best_token in ["<EOL>", "</s>", "<PAD>", "<UNK>", ""]:
                return ""
            return best_token

    def predict_top_k(self, code_text: str, k: int = 5) -> list:
        tokens = simple_tokenize(code_text)
        if not tokens:
            return []
            
        input_ids = [self.token_to_id.get(token, self.unk_id) for token in tokens[-999:]]
        input_tensor = torch.tensor([input_ids], dtype=torch.long).to(self.device)
        
        with torch.no_grad():
            outputs, _ = self.model(input_tensor)
            logits = outputs[0, -1, :]
            
            logits[self.unk_id] = -float('Inf')
            logits[self.pad_id] = -float('Inf')
            
            probs = torch.softmax(logits, dim=-1)
            top_probs, top_indices = torch.topk(probs, k)
            
            results = []
            for prob, idx in zip(top_probs, top_indices):
                token = self.id_to_token.get(idx.item(), "")
                if token not in ["<EOL>", "</s>", "<PAD>", "<UNK>", ""]:
                    results.append({"token": token, "confidence": round(prob.item(), 4)})
            return results
