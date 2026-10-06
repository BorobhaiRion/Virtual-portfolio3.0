/**
 * Supabase client (scaffolding — not wired up yet).
 *
 * Set these in a local `.env` file (never commit real values):
 *   SUPABASE_URL=https://<project-ref>.supabase.co
 *   SUPABASE_ANON_KEY=<anon-public-key>
 *
 * The client is created lazily so nothing breaks before the dependency is
 * installed with: npm install @supabase/supabase-js
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let client = null;

function hasCredentials() {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getSupabase() {
    if (client) return client;

    if (!hasCredentials()) {
        throw new Error(
            'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY first.'
        );
    }

    // Lazy require: keeps the app bootable before the package is installed.
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return client;
}

module.exports = { getSupabase, hasCredentials };
