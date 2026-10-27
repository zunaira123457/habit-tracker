// Entry point for the vendored CodeMirror bundle (vendor/codemirror.js).
// Rebuild with: npm run build:editor
export { EditorView, keymap } from '@codemirror/view';
export { EditorState, Compartment } from '@codemirror/state';
export { basicSetup } from 'codemirror';
export { indentUnit, syntaxHighlighting } from '@codemirror/language';
export { indentWithTab } from '@codemirror/commands';
export { classHighlighter } from '@lezer/highlight';
export { python } from '@codemirror/lang-python';
export { javascript } from '@codemirror/lang-javascript';
