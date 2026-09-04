# Rounds — resident doctor workspace

Next.js 14 / TypeScript / Tailwind / Supabase app for resident doctors:

- **Register** — multiple patients at once (name, age, sex; mobile and email optional), with
  voice dictation or one-time image/PDF parsing that fills in each row. Uploaded files are not stored.
- **Patients** — search, review date-wise consultation snippets, select individual visits, and share
  their complete notes and plan via WhatsApp or email.
- **Consult** — free-text notes plus a structured plan (treatment / investigation / comments),
  each field voice-dictatable.
- **AI analysis** — sends the consult to your MedGemma endpoint for a second-opinion summary.
- **Ask AI** — a standalone query window for any clinical question, not tied to a patient.
- **Feedback** — thumbs up/down on every AI output, logged to Supabase and (optionally) a
  Google Sheet for research.
- **Save / share** — save a consult, or share it straight to the patient's WhatsApp/email.
- **Visit history** — start a new dated visit for a returning patient without overwriting prior notes.

## 1. Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

## 2. Free storage (Supabase Free plan)

1. Create a free project at supabase.com.
2. In **Authentication → Sign In / Providers → Anonymous**, enable anonymous sign-ins.
3. In the SQL editor, run `supabase/schema.sql`. This creates `patients`, `consults`, and
   `ai_feedback` with indexed owner columns and Row Level Security.
4. Copy the Project URL and **publishable/anon key** into `.env.local` and the matching Vercel
   environment variables. A service-role key is not needed and must not be exposed.

The app silently creates a free anonymous Supabase session in the browser. Each browser session
can only read and modify its own records; the old public read/write policies have been removed.
The session persists in that browser, but clearing site data creates a new identity. Add named
staff accounts before using this as a shared or production clinical record system.

### Upgrading the original prototype database

Export any prototype records you need, then run `supabase/migrate_secure_storage.sql`. Existing
unowned rows remain inaccessible by design. For a new/empty project, use only `schema.sql`.

## 3. MedGemma

Point `MEDGEMMA_ENDPOINT` at your existing MedGemma Hugging Face Space (the same one used for
the ECG/X-ray tools). If the Space's response shape differs from `{ summary }` or
`{ generated_text }`, adjust the extraction in `app/api/medgemma/route.ts`.

## 4. Ask AI

Uses the Anthropic API directly. Set `ANTHROPIC_API_KEY` in Vercel. Swap the model in
`ASK_AI_MODEL` if needed.

## 5. Feedback → Google Sheets

Follow `supabase/GOOGLE_SHEETS_SETUP.md` to wire up a free Apps Script webhook — no Google
Cloud project required. Set the resulting URL as `GOOGLE_SHEETS_WEBHOOK_URL`.

## 6. Push to GitHub (iPad / Working Copy workflow)

Since this was delivered as a zip:

1. Unzip on your iPad.
2. In **Working Copy**, create a new local repository and import the unzipped folder
   (or use the Files app share sheet → "Working Copy" → "Add to existing/new repo").
3. Commit, then create a new repository on GitHub — either via the GitHub app/web UI
   (github.com/new, under `shivesh2334-ai`) or directly from Working Copy's push flow,
   which offers to create the remote repo for you.
4. Push.

Or from any machine with git + the GitHub CLI:

```bash
git init
git add .
git commit -m "Initial commit — Rounds resident doctor app"
gh repo create shivesh2334-ai/rounds-resident-app --public --source=. --push
```

## 7. Deploy to Vercel

1. Go to vercel.com → **Add New → Project** → import the GitHub repo you just created.
2. Framework preset: Next.js (auto-detected).
3. Region: set to **Mumbai (bom1)** under Project Settings → Functions, matching your other apps.
4. Add all the environment variables from `.env.example` under Project Settings → Environment
   Variables (Production and Preview).
5. Deploy.

Or from the CLI:

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add MEDGEMMA_ENDPOINT
vercel env add ANTHROPIC_API_KEY
vercel env add GOOGLE_SHEETS_WEBHOOK_URL
vercel --prod
```

## Notes on voice input

Dictation uses the browser's built-in Web Speech API (`webkitSpeechRecognition`), so it works
without any extra service — best support is in Chrome/Edge on desktop and Android; Safari/iOS
support is more limited. On the registration page, dictating a row like "Ramesh Kumar, 54,
male, mobile 9876543210" auto-fills name/age/sex/mobile; check and correct before saving.

## Image / PDF patient registration

Registration accepts JPG, PNG, GIF, WebP, and PDF files up to 4 MB. The file is sent directly to
the configured Anthropic model for one-time extraction into the registration fields and is never
written to Supabase or another app storage bucket. Always verify extracted demographics before saving.

## Clinical safety

AI outputs (MedGemma analysis and Ask AI answers) are decision support, not a diagnosis — the
UI keeps them visually separate from the resident's own notes and every output carries a
feedback control so misfires get tracked.
