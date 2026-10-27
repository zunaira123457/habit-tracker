// One entry per AI feature. Each validates its input, builds the user message,
// and calls the shared AI service with that feature's prompt from prompts/.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AIError, generate } from './ai-service.js';

/** Read a challenge's description and solution notes on the server (never sent from the browser). */
async function challengeDocs(id) {
  if (typeof id !== 'string' || !/^[a-z0-9-]{3,60}$/.test(id)) throw new AIError('Unknown challenge.', 400);
  const dir = path.join(process.cwd(), 'data', 'debugging', id);
  try {
    const [description, solution] = await Promise.all([readFile(path.join(dir, 'description.md'), 'utf8'), readFile(path.join(dir, 'SOLUTION.md'), 'utf8')]);
    return { description, solution };
  } catch { throw new AIError('Unknown challenge.', 400); }
}

const LEVEL_NAMES = { 1: 'a hint toward the pattern', 2: 'an approach outline', 3: 'a full explanation' };
const str = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v, max = 1e6) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(0, Number(v))) : 0);

const RATING = { type: 'string', enum: ['strong', 'okay', 'weak'] };
const rubricItem = { type: 'object', additionalProperties: false, required: ['rating', 'note'], properties: { rating: RATING, note: { type: 'string' } } };
const BEHAVIORAL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['score', 'summary', 'rubric', 'improvements', 'rewrite', 'missingDetails', 'delivery'],
  properties: {
    score: { type: 'integer' },
    summary: { type: 'string' },
    rubric: {
      type: 'object', additionalProperties: false, required: ['star', 'specificity', 'impact', 'results', 'length'],
      properties: { star: rubricItem, specificity: rubricItem, impact: rubricItem, results: rubricItem, length: rubricItem },
    },
    improvements: { type: 'array', items: { type: 'string' } },
    rewrite: { type: 'string' },
    missingDetails: { type: 'array', items: { type: 'string' } },
    delivery: { type: 'object', additionalProperties: false, required: ['fillers', 'pacing'], properties: { fillers: { type: 'string' }, pacing: { type: 'string' } } },
  },
};
const fmtSec = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

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

  /** Behavioral answer → score, rubric, improvements, a rewrite that uses only the candidate's facts. */
  async 'behavioral-feedback'(input) {
    const question = str(input.question, 500), answer = str(input.answer, 12000);
    const voice = input.mode === 'voice';
    const m = input.metrics || {};
    if (!question) throw new AIError('Missing question.', 400);
    if (answer.split(/\s+/).filter(Boolean).length < 10) throw new AIError('The answer is too short to review. Aim for at least a few sentences.', 400);
    const fillers = m.fillers && typeof m.fillers === 'object' ? Object.entries(m.fillers).slice(0, 20).map(([w, n]) => `${str(w, 20)} ×${num(n, 999)}`).join(', ') : '';

    const content = [
      `Question (${str(input.theme, 60) || 'behavioral'}): ${question}`,
      `Answer mode: ${voice ? 'spoken, transcribed by browser speech recognition' : 'typed'}`,
      `Measurements: ${num(m.words)} words · ${voice ? `spoken for ${fmtSec(num(m.durationSec))} at ${num(m.wpm)} wpm` : `about ${fmtSec(num(m.durationSec))} if spoken at 150 wpm`} · "I/me/my" ×${num(m.iCount)} · "we/us/our" ×${num(m.weCount)}`,
      voice ? `Filler words detected: ${fillers || 'none detected'} (total ${num(m.totalFillers)})` : '',
      `\nAnswer:\n"""\n${answer}\n"""`,
    ].filter(Boolean).join('\n');

    const fb = await generate({
      prompt: 'behavioral-feedback',
      messages: [{ role: 'user', content }],
      schema: BEHAVIORAL_SCHEMA,
      mock: () => mockBehavioral(num(m.words), voice),
    });
    // Normalize so the client can rely on the shape.
    return {
      score: Math.min(10, Math.max(1, Math.round(Number(fb.score) || 1))),
      summary: str(fb.summary, 1000),
      rubric: Object.fromEntries(['star', 'specificity', 'impact', 'results', 'length'].map(k => [k, {
        rating: ['strong', 'okay', 'weak'].includes(fb.rubric?.[k]?.rating) ? fb.rubric[k].rating : 'okay',
        note: str(fb.rubric?.[k]?.note, 500),
      }])),
      improvements: (Array.isArray(fb.improvements) ? fb.improvements : []).slice(0, 3).map(s => str(s, 600)),
      rewrite: str(fb.rewrite, 8000),
      missingDetails: (Array.isArray(fb.missingDetails) ? fb.missingDetails : []).slice(0, 10).map(s => str(s, 200)),
      delivery: voice ? { fillers: str(fb.delivery?.fillers, 600), pacing: str(fb.delivery?.pacing, 600) } : null,
    };
  },

  /** Debugging challenge help, in order: 1 → 2 → 3. Grounded in the challenge's solution notes. */
  async 'debugging-hint'(input) {
    const level = Number(input.level);
    const previous = Array.isArray(input.previousHints) ? input.previousHints.map(h => str(h)) : [];
    if (![1, 2, 3].includes(level)) throw new AIError('Hint level must be 1, 2 or 3.', 400);
    if (previous.length < level - 1) throw new AIError('Ask for the earlier hint levels first.', 400);
    const docs = await challengeDocs(input.challengeId);
    const content = [
      `## Challenge description\n${docs.description}`,
      `## Official solution notes (the candidate has not seen these)\n${docs.solution}`,
      `## Requested: level ${level}`,
      ...previous.slice(0, level - 1).map((h, i) => `## Level ${i + 1} already given\n${h}`),
      str(input.diff, 20000) ? `## The candidate's changes so far\n\`\`\`diff\n${str(input.diff, 20000)}\n\`\`\`` : '## The candidate has not changed any code yet.',
    ].join('\n\n');
    const hint = await generate({
      prompt: 'debugging-hint',
      messages: [{ role: 'user', content }],
      mock: () => ({
        1: '**Mock hint (level 1).** Run the visible test and read the failing assertion closely: what value did you expect, and which function produced the one you got?',
        2: '**Mock hint (level 2).** Look at the shared helper the failing service calls. The symptom shows up in the service, but the cause is in the helper.',
        3: '**Mock explanation (level 3).** The helper has an off-by-one in its loop bounds. Fix it there, not at the call site.',
      })[level],
    });
    return { level, hint };
  },

  /** Review the candidate's diff: root cause vs symptom, what they missed, how an interviewer would see it. */
  async 'debugging-review'(input) {
    const docs = await challengeDocs(input.challengeId);
    const diff = str(input.diff, 30000);
    const t = input.tests || {};
    const failures = (Array.isArray(t.failures) ? t.failures : []).slice(0, 10).map(f => `- ${str(f.name, 200)}: ${str(f.message, 400)}`).join('\n');
    const content = [
      `## Challenge description\n${docs.description}`,
      `## Official solution notes\n${docs.solution}`,
      `## Hidden test result: ${t.passed ? 'PASSED' : 'FAILED'} (${num(t.passedCount, 999)}/${num(t.total, 999)} tests)${failures ? `\nFailing tests:\n${failures}` : ''}`,
      `## Hints used: ${num(input.hintsUsed, 3)} of 3${input.revealed ? ' (they also viewed the official solution)' : ''}`,
      diff ? `## The candidate's changes\n\`\`\`diff\n${diff}\n\`\`\`` : '## The candidate made no changes.',
    ].join('\n\n');
    const r = await generate({
      prompt: 'debugging-review',
      messages: [{ role: 'user', content }],
      schema: REVIEW_SCHEMA,
      mock: () => ({
        verdict: t.passed ? 'root-cause' : 'partial',
        summary: t.passed ? 'Mock review: targeted fixes in the right places.' : 'Mock review: one bug fixed, one still open.',
        bugs: [{ bug: 'Bug 1', status: 'fixed-root-cause', note: 'Fixed in the shared helper, not at the call site.' }, { bug: 'Bug 2', status: t.passed ? 'fixed-root-cause' : 'missed', note: t.passed ? 'Correct comparison.' : 'The boundary case still fails.' }],
        missed: [],
        interviewerView: 'A small, focused diff that fixes the cause reads as a strong signal. Narrating how you found it would make it stronger.',
        tips: ['Reproduce the failure with a test before changing code.', 'Check other callers before changing a shared helper.'],
      }),
    });
    const STATUS = ['fixed-root-cause', 'patched-symptom', 'missed'];
    return {
      verdict: ['root-cause', 'partial', 'symptom-patch', 'incorrect'].includes(r.verdict) ? r.verdict : 'partial',
      summary: str(r.summary, 600),
      bugs: (Array.isArray(r.bugs) ? r.bugs : []).slice(0, 5).map(b => ({ bug: str(b.bug, 200), status: STATUS.includes(b.status) ? b.status : 'missed', note: str(b.note, 600) })),
      missed: (Array.isArray(r.missed) ? r.missed : []).slice(0, 5).map(s => str(s, 400)),
      interviewerView: str(r.interviewerView, 1500),
      tips: (Array.isArray(r.tips) ? r.tips : []).slice(0, 3).map(s => str(s, 400)),
    };
  },

  /** One interviewer turn about a resume bullet: an opening question, a follow-up, or a finished assessment. */
  async 'resume-turn'(input) {
    const b = input.bullet || {};
    const turns = (Array.isArray(input.turns) ? input.turns : []).slice(0, 6).map(t => ({ question: str(t.question, 600), answer: str(t.answer, 6000) }));
    const maxFollowUps = Math.min(3, Math.max(0, Math.round(num(input.maxFollowUps ?? 2, 3))));
    if (!str(b.text)) throw new AIError('Missing the resume bullet.', 400);
    if (turns.some(t => !t.answer.trim())) throw new AIError('Answer the current question first.', 400);
    const mustFinish = turns.length >= 1 + maxFollowUps;
    const opening = turns.length === 0;
    const content = [
      `Bullet (${str(b.section, 20)}: ${str(b.context, 200)}): "${str(b.text, 800)}"`,
      `Candidate's skills: ${(Array.isArray(input.skills) ? input.skills : []).slice(0, 40).map(x => str(x, 40)).join(', ') || 'not listed'}`,
      opening ? 'There is no conversation yet. Ask the opening question.' : turns.map((t, i) => `${i === 0 ? 'Opening question' : `Follow-up ${i}`}: ${t.question}\nCandidate: ${t.answer}`).join('\n\n'),
      opening ? '' : mustFinish ? 'You have reached the follow-up limit. Finish this bullet now with an assessment.' : `Follow-ups used: ${turns.length - 1} of ${maxFollowUps}. Ask a follow-up or finish.`,
    ].filter(Boolean).join('\n\n');
    const r = await generate({
      prompt: 'resume-interviewer',
      messages: [{ role: 'user', content }],
      schema: RESUME_TURN_SCHEMA,
      mock: () => opening ? { question: `Mock question: what was the hardest part of "${str(b.text, 60)}"?`, done: false, assessment: EMPTY_ASSESSMENT }
        : (!mustFinish && turns.length === 1 && turns[0].answer.split(/\s+/).length < 25)
          ? { question: 'Mock follow-up: what exactly did you do yourself, as opposed to the team?', done: false, assessment: EMPTY_ASSESSMENT }
          : { question: '', done: true, assessment: { rating: turns.at(-1).answer.split(/\s+/).length > 40 ? 'strong' : 'okay', note: 'Mock assessment: clear on what you built; add how you measured the result.', practiceAgain: true, reword: '' } },
    });
    // Enforce the turn rules regardless of what the model chose.
    const done = mustFinish || (!opening && !!r.done) || (!opening && !str(r.question).trim());
    if (!done && !str(r.question).trim()) throw new AIError('The interviewer had no question. Try again.', 502);
    const a = r.assessment || {};
    return {
      question: done ? '' : str(r.question, 600),
      done,
      assessment: done ? (rating => ({ rating, note: str(a.note, 800), practiceAgain: rating !== 'strong', reword: str(a.reword, 800) }))(
        ['strong', 'okay', 'weak'].includes(a.rating) ? a.rating : 'okay') : null,
    };
  },

  /** Debrief at the end of a resume session. */
  async 'resume-summary'(input) {
    const items = (Array.isArray(input.items) ? input.items : []).slice(0, 12);
    if (!items.length) throw new AIError('Nothing to summarize yet.', 400);
    const content = items.map((it, i) => [
      `### Bullet ${i + 1}: "${str(it.text, 600)}"`,
      ...(Array.isArray(it.turns) ? it.turns : []).slice(0, 6).map(t => `Q: ${str(t.question, 600)}\nA: ${str(t.answer, 4000)}`),
      it.assessment ? `Assessment: ${str(it.assessment.rating, 10)}. ${str(it.assessment.note, 600)}` : 'Skipped.',
    ].join('\n')).join('\n\n');
    const r = await generate({
      prompt: 'resume-summary',
      messages: [{ role: 'user', content }],
      schema: RESUME_SUMMARY_SCHEMA,
      mock: () => ({ overall: 'Mock debrief: you explained what you built clearly but were vaguer on why and how you measured it.', strengths: ['Concrete about your own code.'], focus: ['Explain why you chose each technology.'], tips: ['Prepare one number for every bullet that claims an improvement.'] }),
    });
    const list = v => (Array.isArray(v) ? v : []).slice(0, 3).map(x => str(x, 400));
    return { overall: str(r.overall, 1200), strengths: list(r.strengths), focus: list(r.focus), tips: list(r.tips) };
  },
};

const EMPTY_ASSESSMENT = { rating: 'okay', note: '', practiceAgain: true, reword: '' };
const RESUME_TURN_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['question', 'done', 'assessment'],
  properties: {
    question: { type: 'string' },
    done: { type: 'boolean' },
    assessment: { type: 'object', additionalProperties: false, required: ['rating', 'note', 'practiceAgain', 'reword'], properties: {
      rating: { type: 'string', enum: ['strong', 'okay', 'weak'] }, note: { type: 'string' }, practiceAgain: { type: 'boolean' }, reword: { type: 'string' } } },
  },
};
const RESUME_SUMMARY_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['overall', 'strengths', 'focus', 'tips'],
  properties: { overall: { type: 'string' }, strengths: { type: 'array', items: { type: 'string' } }, focus: { type: 'array', items: { type: 'string' } }, tips: { type: 'array', items: { type: 'string' } } },
};

const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['verdict', 'summary', 'bugs', 'missed', 'interviewerView', 'tips'],
  properties: {
    verdict: { type: 'string', enum: ['root-cause', 'partial', 'symptom-patch', 'incorrect'] },
    summary: { type: 'string' },
    bugs: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['bug', 'status', 'note'], properties: {
      bug: { type: 'string' }, status: { type: 'string', enum: ['fixed-root-cause', 'patched-symptom', 'missed'] }, note: { type: 'string' } } } },
    missed: { type: 'array', items: { type: 'string' } },
    interviewerView: { type: 'string' },
    tips: { type: 'array', items: { type: 'string' } },
  },
};

function mockBehavioral(words, voice) {
  const short = words < 180;
  return {
    score: short ? 5 : 7,
    summary: `Mock feedback. ${short ? 'Clear situation, but the answer is short and the result is vague.' : 'Good structure; make your own actions and the result more specific.'}`,
    rubric: {
      star: { rating: 'okay', note: 'Situation and action are there; the result is only one sentence.' },
      specificity: { rating: short ? 'weak' : 'okay', note: 'Name the system and the exact change you made.' },
      impact: { rating: 'okay', note: 'Several "we" statements hide what you personally did.' },
      results: { rating: 'weak', note: 'No measurable outcome yet.' },
      length: { rating: short ? 'weak' : 'strong', note: short ? 'Under a minute when spoken; aim for about two.' : 'About the right length.' },
    },
    improvements: [
      'Spend more of the answer on the steps you personally took, in order.',
      'End with a measurable result, like time saved or users affected.',
      'Cut the background to two sentences.',
    ],
    rewrite: 'In my second year I was on a four-person team building [the project]. Two weeks before the demo, I noticed [the problem]. I took ownership of fixing it: first I [your first step], then I [your second step]. As a result, [the measurable outcome], and I learned to [the lesson].',
    missingDetails: ['the project', 'the problem', 'your first step', 'your second step', 'the measurable outcome', 'the lesson'],
    delivery: voice ? { fillers: 'A few fillers ("like", "basically"); pause briefly instead.', pacing: 'Comfortable pace overall.' } : { fillers: '', pacing: '' },
  };
}
