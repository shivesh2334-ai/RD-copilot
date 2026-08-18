# Logging AI feedback to Google Sheets

The app posts every thumbs up/down to `/api/feedback`, which saves a copy in Supabase
and also forwards it to a Google Sheet if `GOOGLE_SHEETS_WEBHOOK_URL` is set. Here's
the fastest way to create that webhook, no Google Cloud project needed:

1. Create a new Google Sheet, e.g. "Rounds AI Feedback".
2. Add a header row: `created_at | source | vote | prompt | ai_output | patient_id | consult_id`
3. Go to **Extensions → Apps Script**, delete the placeholder code, and paste:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.created_at,
    data.source,
    data.vote,
    data.prompt,
    data.ai_output,
    data.patient_id,
    data.consult_id,
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. Click **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the deployment URL (ends in `/exec`) and set it as `GOOGLE_SHEETS_WEBHOOK_URL`
   in your Vercel project's environment variables.
6. Redeploy. Every vote now lands as a new row in the sheet, ready for research analysis.

If you'd rather keep feedback entirely in Supabase and skip Sheets, just leave
`GOOGLE_SHEETS_WEBHOOK_URL` unset — the app will still store everything in the
`ai_feedback` table.
