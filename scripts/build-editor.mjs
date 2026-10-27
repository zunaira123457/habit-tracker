// Bundles CodeMirror into a single ES module so the app needs no build step at runtime.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const here = p => fileURLToPath(new URL(p, import.meta.url));
await build({
  entryPoints: [here('./editor-entry.js')],
  bundle: true, format: 'esm', minify: true, target: 'es2020', legalComments: 'inline',
  outfile: here('../vendor/codemirror.js'),
});
console.log('Wrote vendor/codemirror.js');
