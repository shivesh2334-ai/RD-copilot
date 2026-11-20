"use client";

import Link from "next/link";
import { clinicalAppPath } from "@/lib/consultAgent";
import { useEffect, useMemo, useState } from "react";
import { searchCategories, searchModules, type ContentIndex, type SearchScope } from "@/lib/moduleSearch";

export default function ModuleSearch() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState<ContentIndex>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/clinical-content-index.json", { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error("Index unavailable");
      return r.json();
    }).then(data => setContent(data.apps || {})).catch(() => {}).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  const indexed = Object.values(content).filter(e => e.text).length;
  const results = useMemo(() => searchModules(query, scope, category, content), [query, scope, category, content]);
  return (
    <section aria-label="Search clinical modules" className="space-y-3">
      <p className="text-xs text-paper-ink/60">Search conditions, diagnoses, medicines, treatments, tests and other words across indexed application content. Results link to the application containing the match. Choose All content for the widest search.</p>
      <p role="status" className="text-xs text-paper-ink/60">{loading ? "Loading application content…" : `${indexed} applications have searchable content. Unavailable apps use catalog keywords; some indexes may be partial or from a previous refresh.`}</p>
      <label className="label block" htmlFor="agent-module-search">Search clinical library</label>
      <input id="agent-module-search" type="search" className="input" value={query} maxLength={300} onChange={e => setQuery(e.target.value)} placeholder="e.g. diabetes treatment, troponin, INR, COPD" />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs space-y-1">Search in
          <select className="input" value={scope} onChange={e => setScope(e.target.value as SearchScope)}>
            <option value="all">All content / keywords</option><option value="topics">Topics / conditions / diseases</option><option value="treatment">Treatment</option><option value="tests">Investigations / tests</option>
          </select>
        </label>
        <label className="text-xs space-y-1">Category
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>{searchCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Example searches">
        {["Chest pain", "HbA1c", "INR", "Spirometry", "ABG"].map(q => <button type="button" className="btn-secondary text-xs" key={q} onClick={() => { setQuery(q); setScope("all"); setCategory(""); }}>{q}</button>)}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p role="status" className="text-xs text-paper-ink/60">{results.length} {results.length === 1 ? "module" : "modules"} found</p>
        <button type="button" className="text-xs text-teal-700 underline" onClick={() => { setQuery(""); setScope("all"); setCategory(""); }}>Clear filters</button>
      </div>
      {results.length === 0 && <p className="text-sm">No matching modules. Try a shorter keyword, abbreviation or another category.</p>}
      <ul className="space-y-2">
        {results.map(m => <li key={m.id} className="rounded-md border border-teal-100 p-3 space-y-1">
          <Link href={clinicalAppPath(m.label)} prefetch={false} className="font-medium text-sm text-teal-700 underline">{m.label}</Link>
          <p className="text-xs text-paper-ink/55">{m.category} · Content: {m.contentStatus}{m.indexedAt ? ` · Updated ${m.indexedAt.slice(0, 10)}` : ""}</p>
          {m.excerpt && <p className="text-xs">…{m.excerpt}…</p>}
          <p className="text-xs text-paper-ink/60">Keywords: {scope === "tests" ? m.tests : scope === "treatment" ? m.treatment : m.topics || m.label}</p>
        </li>)}
      </ul>
    </section>
  );
}
