import { EditorView, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { history, historyKeymap } from '@codemirror/commands'
import { foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldKeymap } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { defaultKeymap } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'

export function createEditor(container, additionalExtensions = []) {
  const cursorListener = EditorView.updateListener.of(update => {
    if (update.selectionSet) {
      const state = update.state;
      const head = state.selection.main.head;
      const line = state.doc.lineAt(head);
      const col = head - line.from + 1;
      const statusRight = document.getElementById('status-right');
      if (statusRight) {
        statusRight.textContent = `Ln ${line.number}, Col ${col}`;
      }
    }
  });

  const customTheme = EditorView.theme({
    "&": {
      fontFamily: "monospace",
      fontSize: "14px"
    }
  });

  const extensions = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap
    ]),
    python(),
    oneDark,
    customTheme,
    cursorListener,
    ...additionalExtensions
  ];

  const state = EditorState.create({
    extensions
  });

  return new EditorView({
    state,
    parent: container
  });
}
