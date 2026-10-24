const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const output = mkdtempSync(join(tmpdir(), 'mediround-agent-'));
execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), 'lib/consultAgent.ts', 'lib/clinicalLibrary.ts', '--module', 'commonjs', '--target', 'ES2019', '--skipLibCheck', '--outDir', output]);
const { validateReply, agentModules } = require(join(output, 'consultAgent.js'));
process.on('exit', () => rmSync(output, { recursive: true, force: true }));
const base = { stage: 'questions', summary: '56-year-old man requesting screening', questions: ['Any current symptoms?'], opinion: 'Assessment pending', moduleIds: ['Health screening advisor'], missingInputs: ['Symptoms'] };
test('routes screening to the same catalog as the sidebar', () => {
  const r = validateReply(base);
  assert.equal(agentModules.find(m => m.id === r.moduleIds[0]).href, 'https://health-screening-advisor-india.vercel.app/');
});
test('rejects invented modules and arbitrary URLs', () => {
  assert.throws(() => validateReply({ ...base, moduleIds: ['https://untrusted.example'] }));
});
test('does not mark incomplete input as ready for review', () => {
  assert.equal(validateReply({ ...base, stage: 'review' }).stage, 'questions');
});
test('preserves urgent escalation even with missing data', () => {
  assert.equal(validateReply({ ...base, stage: 'urgent' }).stage, 'urgent');
});
test('rejects malformed model replies', () => {
  for (const value of [null, {}, { ...base, questions: 'test' }, { ...base, stage: 'final' }]) assert.throws(() => validateReply(value));
});
