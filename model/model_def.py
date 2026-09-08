import torch
import torch.nn as nn

class ResidualRecurrentModel(nn.Module):
    def __init__(self, vocab_size, embed_dim=256, hidden_dim=512, dropout=0.3):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.dropout = nn.Dropout(dropout)
        self.core1 = nn.LSTM(embed_dim, hidden_dim, num_layers=1, batch_first=True)
        self.core2 = nn.LSTM(hidden_dim, hidden_dim, num_layers=1, batch_first=True)
        self.fc = nn.Linear(hidden_dim, vocab_size)

    def forward(self, x, h=None):
        if h is None:
            h1c1 = h2c2 = None
        else:
            h1c1, h2c2 = h
        x = self.dropout(self.embedding(x))
        y1, h1c1 = self.core1(x, h1c1)
        y2, h2c2 = self.core2(self.dropout(y1), h2c2)
        y = self.dropout(y1 + y2)  # residual connection
        y = self.fc(y)
        return y, (h1c1, h2c2)
