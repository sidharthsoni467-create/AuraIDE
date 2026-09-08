import json
import os
import random
from collections import Counter
from datasets import load_dataset

CACHE_FILE = os.path.join(os.path.dirname(__file__), "vocab_cache.json")

def build_vocab():
    dataset = load_dataset('google/code_x_glue_cc_code_completion_token', 'python')
    train_val = dataset['train']
    idx = list(range(len(train_val)))
    random.seed(42)
    random.shuffle(idx)
    n = int(0.8 * len(idx))
    
    train_dataset = train_val.select(idx[:n])
    
    counter = Counter()
    for row in train_dataset:
        counter.update(row['code'])
        
    most_common = counter.most_common(10000)
    vocab_list = ['<PAD>', '<UNK>'] + [token for token, count in most_common]
    
    token_to_id = {token: i for i, token in enumerate(vocab_list)}
    id_to_token = {i: token for i, token in enumerate(vocab_list)}
    
    with open(CACHE_FILE, 'w') as f:
        json.dump({'vocab_list': vocab_list, 'token_to_id': token_to_id, 'id_to_token': id_to_token}, f)
        
    return vocab_list, token_to_id, id_to_token

def load_vocab():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                data = json.load(f)
            id_to_token = {int(k): v for k, v in data['id_to_token'].items()}
            return data['vocab_list'], data['token_to_id'], id_to_token
        except Exception:
            pass
    return build_vocab()
