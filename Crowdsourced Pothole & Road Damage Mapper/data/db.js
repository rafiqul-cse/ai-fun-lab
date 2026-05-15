/**
 * FixMyStreet বরিশাল — Data Layer (db.js)
 * Corrected for Supabase Integration
 */

// 1. Initialize Supabase
// Ensure your URL and KEY are 100% correct from your Supabase Dashboard
const supabaseUrl = 'https://your-project-id.supabase.co'; 
const supabaseKey = 'xgpjpzxnpmmwwjavpfhr';
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

/** Fetches a single issue by ID */
async function getIssueById(id) {
  try {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("GetIssue Error:", err.message);
    return null;
  }
}

/** Adds a new issue to the cloud */
async function addIssue(issue) {
  try {
    const { data, error } = await supabase
      .from('issues') 
      .insert([{
        type: issue.type,
        description: issue.desc,
        lat: issue.lat,
        lng: issue.lng,
        status: 'pending',
        area: issue.area || 'Barishal',
        reporter: issue.reporter,
        major: issue.major || 'না',
        votes: 0
      }])
      .select(); // CRITICAL: This is needed to return the newly created row

    if (error) throw error;
    return data[0]; // Returns the single object we just created
  } catch (err) {
    console.error("Supabase Insert Error:", err.message);
    throw err;
  }
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
  const issue = await getIssueById(id);
  if (!issue) return;

  const { error } = await supabase
    .from('issues')
    .update({ votes: (issue.votes || 0) + 1 })
    .eq('id', id);

  if (error) console.error("Vote Error:", error.message);
}

// ─── Priority logic ──────────────────────────────────────────────────────────
function priorityScore(issue) {
  const votes = issue.votes || 0;
  const majorBonus = issue.major === 'হ্যাঁ' ? 50 : 0;
  const createdDate = issue.created_at ? new Date(issue.created_at) : new Date();
  const ageBonus = Math.max(0, 30 - Math.floor((Date.now() - createdDate.getTime()) / 86400000));
  return (votes * 10) + majorBonus + ageBonus;
}

function sortByPriority(issues) {
  return [...issues].sort((a, b) => priorityScore(b) - priorityScore(a));
}

// ─── Users ───────────────────────────────────────────────────────────────────

/** Helper to get current logged in user metadata */
async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata.full_name || 'Anonymous',
      area: user.user_metadata.area || 'Barishal'
    };
  } catch (err) {
    return null;
  }
}

// ─── Comments & Local Storage ────────────────────────────────────────────────
function _load(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function _save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

const KEYS = { COMMENTS: 'fms_comments', LIKES: 'fms_likes' };

async function getCommentsByIssue(issueId) {
  // Currently searching local storage, you can later move this to Supabase too
  return _load(KEYS.COMMENTS).filter(c => c.issueId === issueId);
}
