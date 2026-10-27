# Word frequency

A writing tool shows the most common words in a document.

## Files
- `models/document.js`: a `Document` (title + body)
- `services/frequency.js`: `wordCounts(text)` and `topWords(text, n)`
- `utils/text.js`: `tokenize(text)`

## Expected behavior
- `tokenize` lowercases and keeps only words made of letters and apostrophes. Punctuation and numbers are ignored, so `"The cat, the CAT!"` gives `the cat the cat`.
- `wordCounts` returns a **`Map`** from word to count. It must work for **any** word, including ones like `constructor` or `toString`.
- `topWords(text, n)` returns `[word, count]` pairs, most frequent first, with ties alphabetical.

## Bug report
> A document about JavaScript classes said the word "constructor" appeared `function Object() { [native code] }1` times. And "The" and "the" are counted as different words.

There are **2 bugs**.
