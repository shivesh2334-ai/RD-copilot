const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const output = mkdtempSync(join(tmpdir(), 'mediround-search-'));
execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), 'lib/moduleSearch.ts', '--module', 'commonjs', '--target', 'ES2019', '--skipLibCheck', '--resolveJsonModule', '--esModuleInterop', '--outDir', output]);
const { searchModules } = require(join(output, 'moduleSearch.js'));
const { agentModules } = require(join(output, 'consultAgent.js'));
process.on('exit', () => rmSync(output, { recursive: true, force: true }));
const has = (q, label, scope) => searchModules(q, scope).some(m => m.label === label);
test('browse contains every existing module and its original URL', () => {
  assert.equal(searchModules('').length, agentModules.length);
  for (const m of searchModules('')) assert.equal(m.href, agentModules.find(a => a.id === m.id).href);
});
test('finds conditions, treatments and abbreviations', () => {
  assert.ok(has('chest pain', 'Acute coronary syndrome'));
  assert.ok(has('AF', 'Atrial fibrillation advisor'));
  assert.ok(has('diabetes treatment', 'Diabetes pharma treatment'));
  assert.ok(has('metformin', 'Diabetes pharma treatment', 'treatment'));
});
test('finds investigations and tests', () => {
  assert.ok(has('troponin', 'Acute coronary syndrome', 'tests'));
  assert.ok(has('INR', 'Warfarin guide', 'tests'));
  assert.ok(has('spirometry', 'COPD assessment', 'tests'));
  assert.ok(has('HbA1c', 'Diabetes pharma treatment', 'tests'));
});
test('scope and category exclude unrelated results', () => {
  assert.equal(searchModules('metformin', 'tests').length, 0);
  assert.equal(searchModules('troponin', 'all', 'ICU').length, 0);
  assert.ok(searchModules('', 'all', 'ICU').every(m => m.category === 'ICU'));
});
test('handles case, punctuation, empty and unmatched queries', () => {
  assert.ok(has('  CHEST-PAIN! ', 'Acute coronary syndrome'));
  assert.equal(searchModules('nonsensexyz').length, 0);
  assert.equal(searchModules('<script>alert(1)</script>').length, 0);
  assert.equal(searchModules('   ').length, agentModules.length);
});
test('searches application content beyond curated keywords with excerpts and filters', () => {
  const app = agentModules[0];
  const index = { [app.href]: { text: 'Diagnosis of unusualcondition. Treatment with unusualmedicine.', status: 'indexed' } };
  const result = searchModules('unusualcondition', 'all', '', index);
  assert.equal(result.length, 1);
  assert.equal(result[0].href, app.href);
  assert.match(result[0].excerpt, /unusualcondition/);
  assert.equal(searchModules('unusualmedicine', 'all', '', index).length, 1);
  assert.equal(searchModules('unusualcondition missingword', 'all', '', index).length, 0);
  assert.equal(searchModules('unusualcondition', 'tests', '', index).length, 0);
  assert.equal(searchModules('unusualcondition', 'all', 'nonexistent', index).length, 0);
});
test('committed public index covers all catalog applications and content searches', () => {
  const index = require('../public/clinical-content-index.json').apps;
  for (const app of agentModules) assert.ok(index[app.href], `Missing coverage record: ${app.label}`);
  assert.ok(searchModules('uveitis', 'all', '', index).some(m => m.label === 'Eye' && m.excerpt));
  assert.ok(searchModules('trastuzumab', 'all', '', index).some(m => m.label === 'Cardio-oncology' && m.excerpt));
});
