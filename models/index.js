/**
 * Model layer (scaffolding).
 *
 * All data access belongs here so controllers never talk to Supabase directly.
 * The portfolio currently ships its content as EJS views; once Supabase is
 * wired up these functions become the source of truth.
 */
const { getSupabase, hasCredentials } = require('../config/supabase');

/**
 * Projects shown on the "Works" page.
 * Suggested Supabase table: works (id, title, description, url, image_path, sort_order)
 */
async function getWorks() {
    if (!hasCredentials()) return [];
    const { data, error } = await getSupabase()
        .from('works')
        .select('*')
        .order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
}

/**
 * Contact form submissions.
 * Suggested Supabase table: messages (id, name, email, message, created_at)
 */
async function createMessage({ name, email, message }) {
    if (!hasCredentials()) {
        throw new Error('Supabase is not configured.');
    }
    const { data, error } = await getSupabase()
        .from('messages')
        .insert({ name, email, message })
        .select()
        .single();
    if (error) throw error;
    return data;
}

module.exports = { getWorks, createMessage };
