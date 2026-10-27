// PDF text extraction for serverless (Vercel).
//
// pdfjs (inside pdf-parse) needs DOMMatrix, ImageData and Path2D the moment it loads. Locally it
// finds them in @napi-rs/canvas, but it loads that package dynamically, so Vercel's bundler leaves
// it out and the function crashes. Importing pdf-parse/worker (which imports @napi-rs/canvas
// statically) makes the bundler include it; we set the globals ourselves, then load pdf-parse.
import { CanvasFactory } from 'pdf-parse/worker';
import { DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';

globalThis.DOMMatrix ??= DOMMatrix;
globalThis.ImageData ??= ImageData;
globalThis.Path2D ??= Path2D;

const { PDFParse } = await import('pdf-parse');

export async function pdfToText(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer), CanvasFactory });
  try { return (await parser.getText()).text; } finally { await parser.destroy(); }
}
