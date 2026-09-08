let ws = null;
let localRevision = 0;
let pendingOps = [];  // ops sent but not yet acknowledged
let username = '';  // set during setupCollaboration

export function setupCollaboration(roomName, name, userColor) {
    username = name;
    ws = new WebSocket(`ws://localhost:9090`);

    ws.onopen = () => {
        console.log('[Collab] Connected to C++ server');
        sendMessage({ type: 'join', client_id: name, room: roomName, color: userColor });
    };

    ws.onmessage = (event) => {
        const op = JSON.parse(event.data);
        if (op.type === 'insert' || op.type === 'delete') {
            applyRemoteOp(op);
        }
        if (op.type === 'ack') {
            localRevision = op.revision;
        }
    };

    ws.onclose = () => console.log('[Collab] Disconnected');
    ws.onerror = (e) => console.error('[Collab] Error', e);

    return { ws, getRevision: () => localRevision };
}

export function sendOp(type, position, text, length = 0) {
    const op = {
        type,
        position,
        text,
        length,
        revision: localRevision,
        client_id: username
    };
    if (ws && ws.readyState === WebSocket.OPEN) {
        sendMessage(op);
        pendingOps.push(op);
    }
}

function sendMessage(obj) {
    ws.send(JSON.stringify(obj) + '\n');
}

export function applyRemoteOp(op) {
    window.dispatchEvent(new CustomEvent('remote-op', { detail: op }));
}

export function getConnectionStatus() {
    return ws ? ws.readyState : WebSocket.CLOSED;
}
