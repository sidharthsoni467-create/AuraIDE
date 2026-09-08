import { StateField, StateEffect } from '@codemirror/state'
import { Decoration, WidgetType, keymap, ViewPlugin } from '@codemirror/view'

export const setGhostText = StateEffect.define();

export const ghostTextState = StateField.define({
  create() { return null; },
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(setGhostText)) return e.value;
    }
    // Immediately clear ghost text on typing or cursor movement
    if (tr.docChanged || tr.selection) return null;
    return value;
  }
});

class GhostWidget extends WidgetType {
  constructor(text) { 
    super(); 
    this.text = text; 
  }
  eq(other) { return this.text === other.text; }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-ghost-text';
    span.textContent = this.text;
    span.style.color = '#888888';
    span.style.opacity = '0.7';
    span.style.fontStyle = 'italic';
    span.style.pointerEvents = 'none';
    return span;
  }
}

export const ghostTextDecorations = ViewPlugin.fromClass(class {
  constructor(view) { this.decorations = this.getDeco(view); }
  update(update) { this.decorations = this.getDeco(update.view); }
  getDeco(view) {
    const text = view.state.field(ghostTextState);
    if (!text) return Decoration.none;
    const pos = view.state.selection.main.head;
    return Decoration.set([Decoration.widget({ widget: new GhostWidget(text), side: 1 }).range(pos)]);
  }
}, { decorations: v => v.decorations });

let fetchTimeout = null;

export const aiAutocompleteListener = ViewPlugin.fromClass(class {
  update(update) {
    if (update.docChanged || update.selectionSet) {
      clearTimeout(fetchTimeout);
      
      fetchTimeout = setTimeout(async () => {
        const head = update.view.state.selection.main.head;
        const from = Math.max(0, head - 1000);
        const codeContext = update.view.state.sliceDoc(from, head);
        
        if (!codeContext.trim()) return;
        
        try {
          const response = await fetch('http://localhost:8001/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: codeContext, k: 5 })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.next_token) {
              // Ensure cursor hasn't moved while we were waiting for the network
              if (update.view.state.selection.main.head === head) {
                const lookahead = update.view.state.sliceDoc(head, head + 10);
                let isRedundant = false;
                
                // Check 1: Exact match immediately following the cursor
                if (update.view.state.sliceDoc(head, head + data.next_token.length) === data.next_token) {
                    isRedundant = true;
                } 
                // Check 2: If predicting a closing bracket, look ahead ignoring quotes and spaces
                else if (['}', ']', ')'].includes(data.next_token)) {
                    const nextMeaningful = lookahead.replace(/['"\s]/g, '');
                    if (nextMeaningful.startsWith(data.next_token)) {
                        isRedundant = true;
                    }
                }

                if (!isRedundant) {
                  update.view.dispatch({ effects: setGhostText.of(data.next_token) });
                }
              }
            }
          }
        } catch (e) {
          // Ignore fetch errors (e.g., server offline)
        }
      }, 400); // 400ms debounce
    }
  }
});

export const acceptGhostTextCommand = (view) => {
  const text = view.state.field(ghostTextState);
  if (text) {
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, insert: text },
      selection: { anchor: pos + text.length },
      effects: setGhostText.of(null) // clear after accepting
    });
    return true; // Key event handled
  }
  return false; // Key event not handled, let browser/editor do default tab
};

export const ghostTextKeymap = keymap.of([
  { key: "Tab", run: acceptGhostTextCommand }
]);

export function aiAutocomplete() {
  return [
    ghostTextState,
    ghostTextDecorations,
    aiAutocompleteListener,
    ghostTextKeymap
  ];
}
