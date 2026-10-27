const { sleep } = require('./sleep');

// Try once, then retry up to `retries` more times. Rejects with the last error.
async function withRetry(fn, retries, delayMs = 0) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return fn(attempt);
    } catch (err) {
      lastError = err;
      if (delayMs) await sleep(delayMs);
    }
  }
  throw lastError;
}

module.exports = { withRetry };
