import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    "Supabase environment variables are missing.\n" +
    "Copy .env.local.example → .env.local and fill in your credentials."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession:   true,
    autoRefreshToken: true,
  },
});
