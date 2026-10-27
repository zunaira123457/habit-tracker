// Child process used by validate-challenges.mjs: runs one JS test job read from stdin,
// so a buggy infinite loop can be killed without taking down the validator.
import { runJsTests } from '../js/prep/sandbox/js-runner.js';

let input = '';
process.stdin.on('data', d => { input += d; });
process.stdin.on('end', async () => {
  const { files, tests } = JSON.parse(input);
  console.log(JSON.stringify(await runJsTests(files, tests)));
  process.exit(0);
});
