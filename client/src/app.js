import { createEditor } from './editor.js'
import { setupCollaboration, sendOp, getConnectionStatus } from './collab.js'
import { aiAutocomplete } from './autocomplete.js'
import { setupAwareness, getUserColor, updateConnectionStatus, userColors } from './awareness.js'
import { Annotation } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

const remoteTransaction = Annotation.define()

document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.getElementById('username-dialog');
  const form = dialog.querySelector('form');
  const input = document.getElementById('username-input');

  const savedName = localStorage.getItem('aura-username');
  if (savedName) {
    input.value = savedName;
  }

  dialog.showModal();

  form.addEventListener('submit', (e) => {
    const username = input.value.trim() || 'Anonymous';
    localStorage.setItem('aura-username', username);
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room') || 'aura-default';
    
    document.getElementById('room-name').textContent = `Room: ${roomName}`;

    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % userColors.length;
    const userColor = userColors[colorIndex];

    const { ws } = setupCollaboration(roomName, username, userColor);

    const collabListener = EditorView.updateListener.of((update) => {
        if (update.docChanged && !update.transactions.some(t => t.annotation(remoteTransaction))) {
            update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                if (inserted.length > 0) {
                    sendOp('insert', fromA, inserted.toString());
                } else {
                    sendOp('delete', fromA, '', toA - fromA);
                }
            });
        }
    });

    const aiExt = aiAutocomplete();

    const view = createEditor(document.getElementById('editor-container'), [
      collabListener,
      aiExt
    ]);

    window.addEventListener('remote-op', (e) => {
        const op = e.detail;
        if (op.type === 'insert') {
            view.dispatch({
                changes: { from: op.position, insert: op.text },
                annotations: remoteTransaction.of(true)
            });
        } else if (op.type === 'delete') {
            view.dispatch({
                changes: { from: op.position, to: op.position + op.length },
                annotations: remoteTransaction.of(true)
            });
        }
    });

    setupAwareness({});

    ws.onopen = () => updateConnectionStatus(true);
    ws.onclose = () => updateConnectionStatus(false);
  });
});
