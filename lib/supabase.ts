import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isStorageConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in the browser console rather than silently returning no data.
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

// Valid placeholders keep `next build` from crashing while prerendering in CI before
// deployment environment variables are attached. No request is made with these values.
export const supabase = createClient(
  supabaseUrl || "https://storage-not-configured.supabase.co",
  supabaseAnonKey || "storage-not-configured"
);

let sessionPromise: Promise<void> | null = null;

/**
 * Creates a free Supabase anonymous-auth session on first use. This gives every
 * browser a stable user id so Row Level Security can isolate its clinical data.
 * Anonymous sign-ins must be enabled in Supabase Authentication settings.
 */
export async function ensureStorageSession() {
  if (!isStorageConfigured) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to connect storage."
    );
  }
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session) return;

      const { error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) throw signInError;
    })().catch((error) => {
      sessionPromise = null;
      throw error;
    });
  }

  await sessionPromise;
  return supabase;
}
