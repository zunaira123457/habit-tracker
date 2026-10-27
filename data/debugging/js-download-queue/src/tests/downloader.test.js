const { Download } = require('../models/download');
const { downloadAll } = require('../services/downloader');

test('never more than 2 downloads at once', async () => {
  let active = 0, peak = 0;
  const files = [5, 5, 5, 5, 5].map((ms, i) => new Download(`https://cdn/f${i}.mp4`, ms));
  await downloadAll(files, 2, () => { active++; peak = Math.max(peak, active); }, () => { active--; });
  assert.strictEqual(peak, 2, `peak was ${peak}`);
});
