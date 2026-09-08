# Aura IDE

Aura IDE is a browser-based collaborative code editor that combines real-time collaborative editing (CRDT) with an AI-powered code autocomplete model. It builds upon two foundational projects:

1. **SyncText CRDT**: A decentralized C++ collaborative text editor utilizing Last-Writer-Wins (LWW) conflict resolution and POSIX IPC mechanisms. 
2. **NLP Autocomplete**: A PyTorch-based Residual LSTM sequence model trained on the CodeXGLUE Python dataset to predict the next code tokens.

To bring these into the modern web ecosystem, this project transitions the collaborative core to **Yjs** (a mature sequence CRDT implementation in JavaScript) running over WebSockets, and wraps the PyTorch inference logic in a **FastAPI** backend that provides real-time autocomplete suggestions directly to the **CodeMirror 6** text editor.

## Architecture

- **Frontend Editor:** CodeMirror 6 with `y-codemirror.next` for real-time collaboration. Includes syntax highlighting, awareness (multi-user cursors/selection), and AI ghost-text suggestions via a custom completion source.
- **Collaboration Server:** A Node.js `y-websocket` server (running on port `1234`) that routes Yjs document updates and awareness data between all connected clients in a given room.
- **AI Inference Backend:** A Python FastAPI server (running on port `8000`) that serves the trained `ResidualRecurrentModel`. It tokenizes incoming context, runs the model inference, and returns the top 5 predicted tokens.

## Prerequisites

- Node.js (v18+)
- Python (3.9+)

## Setup

1. **Install Node.js dependencies:**
   ```bash
   cd Aura-IDE
   npm install
   ```

2. **Build the frontend client:**
   ```bash
   npm run build
   ```

3. **Install Python dependencies:**
   ```bash
   pip3 install -r requirements.txt
   ```
   *(Note: This includes `torch`, `fastapi`, `uvicorn[standard]`, `datasets`, and `numpy`)*

## Running the Servers

You will need to run two separate processes to fully enable collaboration and AI autocomplete.

**Terminal 1: Start the Collaboration & Static Servers**
```bash
cd Aura-IDE
npm start
```
This will start the WebSocket server on `ws://localhost:1234` and serve the client UI at `http://localhost:3000`.

**Terminal 2: Start the AI Inference Server**
```bash
cd Aura-IDE
python3 server/ai_server.py
```
This will load the PyTorch `.pt` model and expose the `/predict` API at `http://localhost:8000/predict`. (Initial startup may take a moment while it loads the model and vocabulary).

## Using the IDE

1. Open your browser and navigate to `http://localhost:3000`.
2. Enter your name in the welcome dialog.
3. Start typing Python code. If the AI server is running, you'll see autocomplete suggestions appear with a `🤖 AI` badge. Press `Tab` to accept a suggestion.
4. To test collaboration, open a new browser window/tab and navigate to the same URL. You will see both users in the room, along with their live cursors and real-time edits.

You can append `?room=custom-room-name` to the URL to create or join different collaborative sessions.
