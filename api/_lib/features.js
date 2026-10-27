// One entry per AI feature. Each validates its input, builds the user message,
// and calls the shared AI service with that feature's prompt from prompts/.
import { AIError, generate } from './ai-service.js';

const LEVEL_NAMES = { 1: 'a hint toward the pattern', 2: 'an approach outline', 3: 'a full explanation' };
const str = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');

export const features = {
  /** NeetCode problem help, strictly in order: level 1 → 2 → 3. */
  async 'neetcode-hint'(input) {
    const p = input.problem || {};
    const level = Number(input.level);
    const previous = Array.isArray(input.previousHints) ? input.previousHints.map(h => str(h)) : [];
    if (!p.title || !p.slug) throw new AIError('Missing problem details.', 400);
    if (![1, 2, 3].includes(level)) throw new AIError('Hint level must be 1, 2 or 3.', 400);
    if (previous.length < level - 1) throw new AIError('Ask for the earlier hint levels first.', 400);

    const lines = [
      `Problem: ${str(p.title, 200)} (LeetCode: ${str(p.slug, 200)})`,
      `Difficulty: ${str(p.difficulty, 20)} · NeetCode category: ${str(p.category, 60)}`,
      `Requested: level ${level}, ${LEVEL_NAMES[level]}.`,
    ];
    previous.slice(0, level - 1).forEach((h, i) => lines.push(`\nLevel ${i + 1} already given:\n${h}`));
    if (str(input.notes)) lines.push(`\nMy current thinking:\n${str(input.notes)}`);

    const hint = await generate({
      prompt: 'neetcode-hint',
      messages: [{ role: 'user', content: lines.join('\n') }],
      mock: () => ({
        1: `**Mock hint (level 1).** What would let you check each element against what you've already seen, in O(1)?`,
        2: `**Mock outline (level 2).**\n1. Walk the array once.\n2. Keep a hash map of value → index.\n3. For each element, look up its complement.\n\nTime O(n), space O(n).`,
        3: `**Mock explanation (level 3).** Store each number's index in a map as you go...\n\n\`\`\`python\ndef solve(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n\`\`\``,
      })[level],
    });
    return { level, hint };
  },
};
