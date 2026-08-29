import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Google Apps Script Web App URL — see /supabase/GOOGLE_SHEETS_SETUP.md for how to create it.
const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
    owner_id: authData.user.id,
    created_at: new Date().toISOString(),
  };

  // Store a durable copy in Supabase for querying alongside patient/consult data.
  const { error: dbError } = await supabase.from("ai_feedback").insert(record);

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
