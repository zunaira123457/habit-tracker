const { mapLimit } = require('../utils/map-limit');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function downloadAll(downloads, limit, onStart = () => {}, onEnd = () => {}) {
  return mapLimit(downloads, limit, async d => {
    onStart(d);
    await sleep(d.ms);
    onEnd(d);
    return d.filename();
  });
}

module.exports = { downloadAll };
