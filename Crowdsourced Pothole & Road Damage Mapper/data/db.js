/**
 * FixMyStreet বরিশাল — Data Layer (db.js)
 * Fixed for Supabase Integration
 */

// Make sure 'supabase' is lowercase and matches your function calls
const supabaseUrl = 'https://your-project-id.supabase.co';
const supabaseKey = 'xgpjpzxnpmmwwjavpfhr';

// Ensure this variable name is EXACTLY 'supabase'
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ─── Issues ──────────────────────────────────────────────────────────────────

/** Loads all issues from Supabase */
async function loadIssues() {
  try {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Connection Error:', err.message);
    return [];
  }
}

/** Fetches a single issue by ID from the cloud */
async function getIssueById(id) {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
}

/** Adds a new issue to the cloud */
async function addIssue(issue) {
  // Use .from() - double check the spelling!
  const { data, error } = await supabase
    .from('issues') 
    .insert([{
      type: issue.type,
      description: issue.desc,
      lat: issue.lat,
      lng: issue.lng,
      status: 'pending',
      area: issue.area || 'Barishal'
    }]);

  if (error) throw error;
  return data;
}

/** Updates status in the cloud */
async function updateIssueStatus(id, status) {
  const { error } = await supabase
    .from('issues')
    .update({ status: status })
    .eq('id', id);
  
  if (error) console.error("Update Error:", error.message);
}

/** Increments votes in the cloud */
async function incrementVote(id) {
  // First get current votes
  const issue = await getIssueById(id);
  if (!issue) return;

  const { error } = await supabase
    .from('issues')
    .update({ votes: (issue.votes || 0) + 1 })
    .eq('id', id);

  if (error) console.error("Vote Error:", error.message);
}

// ─── Priority logic (Stays same, but issues must be passed to it) ─────────────
function priorityScore(issue) {
  const votes = issue.votes || 0;
  const majorBonus = issue.major === 'হ্যাঁ' ? 50 : 0;
  const createdDate = issue.created_at ? new Date(issue.created_at) : new Date();
  const ageBonus = Math.max(0, 30 - Math.floor((Date.now() - createdDate.getTime()) / 86400000));
  return votes * 10 + majorBonus + ageBonus;
}

function sortByPriority(issues) {
  return [...issues].sort((a, b) => priorityScore(b) - priorityScore(a));
}

// ─── Users (Now using Supabase Auth) ─────────────────────────────────────────

/** Helper to get current logged in user metadata */
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata.full_name,
    area: user.user_metadata.area
  };
}

// ─── Comments & Likes (Keeping LocalStorage for now, or move to Supabase) ────
// Note: For a "Perfect" app, you should eventually create a 'comments' table in Supabase too.

function _load(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function _save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

const KEYS = { COMMENTS: 'fms_comments', LIKES: 'fms_likes' };

async function getCommentsByIssue(issueId) {
  // If you move comments to Supabase:
  // const { data } = await supabase.from('comments').select('*').eq('issueId', issueId);
  // return data;
  return _load(KEYS.COMMENTS).filter(c => c.issueId === issueId);
}

// ─── Seed Logic ──────────────────────────────────────────────────────────────
/** * Instead of local seeding, you should insert these manually 
 * once in the Supabase Table Editor to have "Real" global data.
 */
