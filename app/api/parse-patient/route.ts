import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ASK_AI_MODEL || "claude-sonnet-4-6";
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"]);

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) throw new Error("No structured patient details were returned.");
  return JSON.parse(candidate);
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image or PDF to parse." }, { status: 400 });
  }
  if (!SUPPORTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Supported files are JPG, PNG, GIF, WebP, and PDF." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large. Use a file smaller than 4 MB." }, { status: 400 });
  }

  try {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const source = file.type === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: file.type, data } };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system:
          "Extract patient registration details from the supplied image or PDF. Never infer a value that is not visible. Return only valid JSON with keys name, age, sex, mobile, email, ward, admissionDate, notes. Use male, female, or other for sex; YYYY-MM-DD for admissionDate; an integer or null for age; and null for missing values. Put relevant presenting complaint or admission context not covered by another field in notes.",
        messages: [{ role: "user", content: [source, { type: "text", text: "Extract the patient registration fields." }] }],
      }),
    });

    const body = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: body?.error?.message || "Document parsing failed." }, { status: response.status });
    }
    const text = body?.content?.map((item: { text?: string }) => item.text).filter(Boolean).join("\n") || "";
    const parsed = extractJson(text);
    return NextResponse.json({
      patient: {
        name: typeof parsed.name === "string" ? parsed.name : "",
        age: parsed.age == null ? "" : String(parsed.age),
        sex: ["male", "female", "other"].includes(String(parsed.sex).toLowerCase())
          ? String(parsed.sex).toLowerCase()
          : undefined,
        mobile: typeof parsed.mobile === "string" ? parsed.mobile : "",
        email: typeof parsed.email === "string" ? parsed.email : "",
        ward: typeof parsed.ward === "string" ? parsed.ward : "",
        admissionDate: /^\d{4}-\d{2}-\d{2}$/.test(parsed.admissionDate || "") ? parsed.admissionDate : "",
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not parse this file." },
      { status: 500 }
    );
  }
}
