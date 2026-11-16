/* Public content only. Never fetch patient pages, APIs, credentials or arbitrary URLs. */
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = ts.transpileModule(fs.readFileSync('lib/clinicalLibrary.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const sandbox = { exports: {} }; vm.runInNewContext(source, sandbox);
const apps = sandbox.exports.clinicalLibrary.flatMap(s => s.items);
const target = 'public/clinical-content-index.json';
const previous = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')).apps : {};
const entries = {};
async function read(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'error' });
  if (!response.ok) throw Error(`HTTP ${response.status}`);
  if (!/text|javascript|json/.test(response.headers.get('content-type') || '')) throw Error('Unsupported content');
  const reader = response.body.getReader(); const parts = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 3000000) throw Error('Content size limit'); parts.push(Buffer.from(value)); } }
  finally { await reader.cancel(); }
  return Buffer.concat(parts).toString('utf8');
}
function clean(s) { return s.replace(/\\n|\\t/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim(); }
async function index(app) {
  const old = previous[app.href];
  const started = Date.now();
  try {
    const html = await read(app.href);
    if (/Authentication Required|Vercel Security Checkpoint|Sign in to.*AI Studio/i.test(html)) throw Error('Protected content');
    const text = [clean(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '))];
    // Extract display strings from application bundles, including condition data hidden behind tabs.
    const queue = []; const visited = new Set();
    function discover(code, base) {
      for (const match of code.matchAll(/["'`](\/?[^"'`\s<>]*\.(?:js|mjs)(?:\?[^"'`\s<>]*)?)["'`]/g)) {
        try { const u = new URL(match[1], base); if (u.origin === new URL(app.href).origin && !visited.has(u.href)) queue.push(u.href); } catch {}
      }
    }
    function strings(js) {
      for (const m of js.matchAll(/"((?:[^"\\]|\\.){4,2000})"|'((?:[^'\\]|\\.){4,2000})'|`([^`]{4,2000})`/g)) {
        const value = clean((m[1] || m[2] || m[3]).replace(/<[^>]+>/g, " "));
        if (/[a-z]{3}/i.test(value) && !/[{};=<>]|https?:|node_modules|webpack|function\(/.test(value)) text.push(value);
      }
    }
    for (const inline of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) strings(inline[1]);
    discover(html, app.href); let partial = false;
    while (queue.length && visited.size < 35 && Date.now() - started < 60000) {
      const url = queue.shift(); if (visited.has(url)) continue; visited.add(url);
      try {
        const js = await read(url); discover(js, url);
        for (const m of js.matchAll(/"((?:[^"\\]|\\.){4,2000})"|'((?:[^'\\]|\\.){4,2000})'|`([^`]{4,2000})`/g)) {
          const value = clean((m[1] || m[2] || m[3]).replace(/<[^>]+>/g, " "));
          if (/[a-z]{3}/i.test(value) && !/[{};=<>]|https?:|node_modules|webpack|function\(/.test(value)) text.push(value);
        }
      } catch { partial = true; }
    }
    entries[app.href] = { text: [...new Set(text)].join(' • ').slice(0, 900000), indexedAt: new Date().toISOString(), status: partial || queue.length ? 'partial' : 'indexed' };
  } catch (e) { entries[app.href] = { ...(old || { text: '' }), status: old?.text ? 'stale' : 'unavailable', error: e.message }; }
  console.log(app.label, entries[app.href].status, entries[app.href].text.length);
}
(async () => {
  let cursor = 0;
  await Promise.all(Array.from({ length: 6 }, async () => { while (cursor < apps.length) await index(apps[cursor++]); }));
  fs.writeFileSync(target, JSON.stringify({ generatedAt: new Date().toISOString(), apps: entries }));
})();
