const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const output = mkdtempSync(join(tmpdir(), 'mediround-voice-'));
execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), 'lib/voiceAgent.ts', 'lib/consultAgent.ts', 'lib/clinicalLibrary.ts', '--module', 'commonjs', '--target', 'ES2019', '--skipLibCheck', '--outDir', output]);
const v = require(join(output, 'voiceAgent.js'));
process.on('exit', () => rmSync(output, { recursive: true, force: true }));

const pts = [
  { id: '1', name: 'Ramesh Kumar', age: 54, sex: 'male', mobile: '9876543210' },
  { id: '2', name: 'Sunita Devi', age: 40, sex: 'female', mobile: null },
];

test('same name and age is treated as already registered', () => {
  const m = v.matchPatient(pts, { name: 'Mr. Ramesh Kumar', age: 54, mobile: null });
  assert.equal(m.kind, 'exact'); assert.equal(m.patient.id, '1');
});
test('same name but different age asks instead of silently reusing or duplicating', () => {
  assert.equal(v.matchPatient(pts, { name: 'Ramesh Kumar', age: 30, mobile: null }).kind, 'candidates');
});
test('unknown patient is not matched', () => {
  assert.equal(v.matchPatient(pts, { name: 'Anil Sharma', age: 33, mobile: null }).kind, 'none');
});
test('missing registration fields are reported, sex is never defaulted', () => {
  assert.deepEqual(v.missingRegistrationFields({ name: 'A', age: 5, sex: null }), ['sex']);
});
test('recorded boxes are kept, only empty boxes are filled', () => {
  const r = v.mergeIntoEmptyBoxes({ notes: 'existing', plan_treatment: '' }, { notes: 'new', treatment: 'aspirin', investigation: null, comments: null });
  assert.deepEqual(r.patch, { plan_treatment: 'aspirin' });
  assert.deepEqual(r.skipped, ['Notes']); assert.deepEqual(r.filled, ['Treatment']);
});
test('parser output is sanitised and never invents sex', () => {
  const r = v.validateParsed({ intent: 'patient_workflow', patient: { name: 'X', age: '54', sex: 'unknown' }, clinical: { notes: ' chest pain ' }, request: 'analyse' });
  assert.equal(r.patient.sex, null); assert.equal(r.patient.age, 54); assert.equal(r.clinical.notes, 'chest pain');
  assert.equal(v.validateParsed({ patient: { age: null } }).patient.age, null);
});
test('analysis rejects invented modules and tolerates fenced JSON', () => {
  const ok = { urgency: 'routine', resultSummary: 's', finalAnalysis: 'f', opinion: 'o', nextSteps: [], moduleLabels: ['Acute coronary syndrome'], missingInputs: [] };
  assert.equal(v.validateAnalysis(ok).moduleLabels[0], 'Acute coronary syndrome');
  assert.throws(() => v.validateAnalysis({ ...ok, moduleLabels: ['https://evil.example'] }));
  assert.deepEqual(v.extractJson('```json\n{"a":1}\n```'), { a: 1 });
});
