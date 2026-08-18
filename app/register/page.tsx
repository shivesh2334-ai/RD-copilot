"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MicButton from "@/components/MicButton";
import type { Sex } from "@/lib/types";

interface DraftPatient {
  key: string;
  name: string;
  age: string;
  sex: Sex;
  mobile: string;
  email: string;
}

function emptyRow(): DraftPatient {
  return {
    key: crypto.randomUUID(),
    name: "",
    age: "",
    sex: "male",
    mobile: "",
    email: "",
  };
}

// Very light parser for a dictated line like:
// "Ramesh Kumar, 54, male, mobile 9876543210" — fills in whatever it can find.
function parseVoiceLine(text: string): Partial<DraftPatient> {
  const ageMatch = text.match(/\b(\d{1,3})\s*(?:years?|yrs?|y\/o)?\b/);
  const sexMatch = text.match(/\b(male|female|other)\b/i);
  const mobileMatch = text.match(/\b(\d{10})\b/);
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const namePart = text.split(",")[0]?.trim();

  return {
    name: namePart && namePart.length < 60 ? namePart : undefined,
    age: ageMatch ? ageMatch[1] : undefined,
    sex: (sexMatch?.[1].toLowerCase() as Sex) || undefined,
    mobile: mobileMatch ? mobileMatch[1] : undefined,
    email: emailMatch ? emailMatch[0] : undefined,
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DraftPatient[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (key: string, patch: Partial<DraftPatient>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (key: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  const handleVoice = (key: string, text: string) => {
    updateRow(key, parseVoiceLine(text));
  };

  const canSubmit = rows.every((r) => r.name.trim() && r.age.trim() && r.sex);

  const submit = async () => {
    setError(null);
    if (!canSubmit) {
      setError("Every row needs at least a name, age, and sex before saving.");
      return;
    }
    setSaving(true);
    const payload = rows.map((r) => ({
      name: r.name.trim(),
      age: Number(r.age),
      sex: r.sex,
      mobile: r.mobile.trim() || null,
      email: r.email.trim() || null,
    }));

    const { data, error: dbError } = await supabase.from("patients").insert(payload).select("id");
    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    if (data && data.length === 1) {
      router.push(`/consult/${data[0].id}`);
    } else {
      router.push("/patients");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">register</span>
        <h1 className="text-2xl font-semibold mt-1">Register patients</h1>
        <p className="text-sm text-paper-ink/60 mt-1">
          Add one patient or a whole ward round at once. Speak a row — name, age, sex, and mobile
          if you have it — and the fields fill themselves in; correct anything that&apos;s off before saving.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row, i) => (
          <div key={row.key} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="label">Patient {i + 1}</span>
              <div className="flex items-center gap-3">
                <MicButton label="Dictate row" onText={(t) => handleVoice(row.key, t)} />
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(row.key)}
                    className="text-xs text-terracotta-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label className="label block mb-1">Name *</label>
                <input
                  className="input"
                  value={row.name}
                  onChange={(e) => updateRow(row.key, { name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="label block mb-1">Age *</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={130}
                  value={row.age}
                  onChange={(e) => updateRow(row.key, { age: e.target.value })}
                />
              </div>
              <div>
                <label className="label block mb-1">Sex *</label>
                <select
                  className="input"
                  value={row.sex}
                  onChange={(e) => updateRow(row.key, { sex: e.target.value as Sex })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label block mb-1">Mobile</label>
                <input
                  className="input"
                  value={row.mobile}
                  onChange={(e) => updateRow(row.key, { mobile: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="sm:col-span-5">
                <label className="label block mb-1">Email</label>
                <input
                  className="input"
                  value={row.email}
                  onChange={(e) => updateRow(row.key, { email: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={addRow} className="btn-secondary text-sm">
          + Add another patient
        </button>
        <button onClick={submit} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : `Save ${rows.length > 1 ? `${rows.length} patients` : "patient"}`}
        </button>
      </div>

      {error && <p className="text-sm text-terracotta-600">{error}</p>}
    </div>
  );
}
