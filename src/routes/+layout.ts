// Client-only app: Supabase auth/session state lives in the browser, and
// every data call goes straight from the browser to Supabase (same
// architecture as the previous Vite+React app — no server in between).
export const ssr = false;
