import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Google Apps Script Web App URL — see /supabase/GOOGLE_SHEETS_SETUP.md for how to create it.
const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { source, vote, prompt, ai_output, patient_id, consult_id } = body;

  if (!source || !vote || !prompt || !ai_output) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  const record = {
    source,
    vote,
    prompt,
    ai_output,
    patient_id: patient_id ?? null,
    consult_id: consult_id ?? null,
    created_at: new Date().toISOString(),
  };

  // Store a durable copy in Supabase for querying alongside patient/consult data.
  const { error: dbError } = await supabaseAdmin.from("ai_feedback").insert(record);

  // Also push to Google Sheets so the research team can work from a spreadsheet directly.
  let sheetsOk = true;
  if (SHEETS_WEBHOOK_URL) {
    try {
      const res = await fetch(SHEETS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      sheetsOk = res.ok;
    } catch {
      sheetsOk = false;
    }
  }

  if (dbError && !SHEETS_WEBHOOK_URL) {
    return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, storedInDb: !dbError, storedInSheets: sheetsOk });
}
