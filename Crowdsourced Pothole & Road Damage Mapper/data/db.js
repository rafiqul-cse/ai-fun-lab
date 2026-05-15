/**
 * FixMyStreet বরিশাল — Data Layer (db.js)
 * All localStorage read/write + seed data lives here.
 */

// ─── Keys ───────────────────────────────────────────────────────────────────
const KEYS = {
  ISSUES  : 'fms_issues',
  USERS   : 'fms_users',
  COMMENTS: 'fms_comments',
  VOTES   : 'fms_votes',        // { userId: [issueId, ...] }
  LIKES   : 'fms_likes',        // { commentId: [userId, ...] }
  NOTIFS  : 'fms_notifs',
};

// ─── Generic helpers ─────────────────────────────────────────────────────────
function _load(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function _save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

// ─── Issues ──────────────────────────────────────────────────────────────────
function loadIssues()       { return _load(KEYS.ISSUES, []); }
function saveIssues(data)   { _save(KEYS.ISSUES, data); }

function getIssueById(id)   { return loadIssues().find(i => i.id === id) || null; }

async function addIssue(issue) {
  const { data, error } = await supabase
    .from('issues')
    .insert([{
      type: issue.type,
      description: issue.desc,
      lat: issue.lat,
      lng: issue.lng,
      status: 'pending',
      area: issue.area || 'Barishal',
      reporter: issue.reporter
    }])
    .select();

  if (error) {
    console.error("Supabase Error:", error.message);
    throw error;
  }
  return data[0];
}

function updateIssueStatus(id, status) {
  const issues = loadIssues();
  const i = issues.find(x => x.id === id);
  if (i) { i.status = status; saveIssues(issues); }
}

function deleteIssue(id) {
  saveIssues(loadIssues().filter(i => i.id !== id));
  // cascade delete comments
  saveComments(loadComments().filter(c => c.issueId !== id));
}

function incrementVote(id) {
  const issues = loadIssues();
  const i = issues.find(x => x.id === id);
  if (i) { i.votes = (i.votes || 0) + 1; saveIssues(issues); }
}

// ─── Priority score (Max-Heap logic) ─────────────────────────────────────────
function priorityScore(issue) {
  const votes     = issue.votes || 0;
  const majorBonus= issue.major === 'হ্যাঁ' ? 50 : 0;
  const ageBonus  = Math.max(0, 30 - Math.floor((Date.now() - new Date(issue.date).getTime()) / 86400000));
  return votes * 10 + majorBonus + ageBonus;
}
function sortByPriority(issues) {
  return [...issues].sort((a, b) => priorityScore(b) - priorityScore(a));
}

// ─── Users ───────────────────────────────────────────────────────────────────
function loadUsers() {
  const stored = _load(KEYS.USERS, []);
  if (!stored.find(u => u.email === 'demo@example.com')) {
    stored.push({ id: 'u_demo', name: 'Demo নাগরিক', email: 'demo@example.com', phone: '01700000000', pass: '123456', area: 'বরিশাল সদর', avatar: '👤', bio: 'বরিশাল শহরের একজন সক্রিয় নাগরিক', joinDate: new Date().toISOString() });
    _save(KEYS.USERS, stored);
  }
  return stored;
}
function saveUsers(u) { _save(KEYS.USERS, u); }
function getUserById(id) { return loadUsers().find(u => u.id === id) || null; }

function registerUser(data) {
  const users = loadUsers();
  if (users.find(u => u.email === data.email)) return { ok: false, msg: 'এই ইমেইল ইতিমধ্যে নিবন্ধিত' };
  const user = { id: 'u_' + Date.now(), ...data, avatar: '👤', bio: '', joinDate: new Date().toISOString() };
  users.push(user);
  saveUsers(users);
  return { ok: true, user };
}

function loginUser(emailOrPhone, pass) {
  const user = loadUsers().find(u => (u.email === emailOrPhone || u.phone === emailOrPhone) && u.pass === pass);
  return user ? { ok: true, user } : { ok: false, msg: 'ভুল ইমেইল বা পাসওয়ার্ড' };
}

// ─── Comments ─────────────────────────────────────────────────────────────────
function loadComments()       { return _load(KEYS.COMMENTS, []); }
function saveComments(c)      { _save(KEYS.COMMENTS, c); }
function getCommentsByIssue(issueId) { return loadComments().filter(c => c.issueId === issueId); }

function addComment(issueId, userId, userName, text) {
  const comments = loadComments();
  const c = { id: Date.now(), issueId, userId, userName, text, date: new Date().toISOString(), likes: 0 };
  comments.push(c);
  saveComments(comments);
  return c;
}

function likeComment(commentId, userId) {
  const likes = _load(KEYS.LIKES, {});
  const arr = likes[commentId] || [];
  if (arr.includes(userId)) return false;
  arr.push(userId);
  likes[commentId] = arr;
  _save(KEYS.LIKES, likes);
  // bump count in comments
  const comments = loadComments();
  const c = comments.find(x => x.id === commentId);
  if (c) { c.likes = arr.length; saveComments(comments); }
  return true;
}

function hasLikedComment(commentId, userId) {
  const likes = _load(KEYS.LIKES, {});
  return (likes[commentId] || []).includes(userId);
}

// ─── Votes ────────────────────────────────────────────────────────────────────
function hasVoted(userId, issueId) {
  const votes = _load(KEYS.VOTES, {});
  return (votes[userId] || []).includes(issueId);
}
function castVote(userId, issueId) {
  if (hasVoted(userId, issueId)) return false;
  const votes = _load(KEYS.VOTES, {});
  votes[userId] = [...(votes[userId] || []), issueId];
  _save(KEYS.VOTES, votes);
  incrementVote(issueId);
  return true;
}

// ─── Notifications ────────────────────────────────────────────────────────────
function loadNotifs(userId)   { return _load(KEYS.NOTIFS + '_' + userId, []); }
function addNotif(userId, msg){ const n = loadNotifs(userId); n.unshift({ id: Date.now(), msg, read: false, date: new Date().toISOString() }); _save(KEYS.NOTIFS + '_' + userId, n.slice(0,30)); }
function markNotifsRead(userId){ const n = loadNotifs(userId).map(x=>({...x,read:true})); _save(KEYS.NOTIFS + '_' + userId, n); }

// ─── Seed data ────────────────────────────────────────────────────────────────
function seedDemoIssues() {
  if (loadIssues().length > 0) return;
  const demos = [
    { id: 1, type: 'গর্ত/পটহোল', desc: 'সদর রোডে বড় গর্ত, রাতে বিপজ্জনক। প্রায় ২ ফুট গভীর। এলাকাবাসী অনেকবার পড়ে আহত হয়েছেন।', lat: 22.705, lng: 90.370, votes: 47, major: 'হ্যাঁ', status: 'pending', reporter: 'রাহেলা বেগম', reporterId: 'u_demo', date: new Date(Date.now()-5*86400000).toISOString(), photo: null, area: 'বরিশাল সদর' },
    { id: 2, type: 'ভাঙা রাস্তা', desc: 'নথুল্লাবাদ বাস স্ট্যান্ডের সামনে রাস্তা ভেঙে গেছে। যানবাহন চলাচল বিঘ্নিত হচ্ছে।', lat: 22.698, lng: 90.365, votes: 32, major: 'হ্যাঁ', status: 'progress', reporter: 'করিম আহমেদ', reporterId: 'u_demo', date: new Date(Date.now()-10*86400000).toISOString(), photo: null, area: 'নথুল্লাবাদ' },
    { id: 3, type: 'ভাঙা স্ট্রিটলাইট', desc: 'কাউনিয়া ব্রিজের কাছে ৩টি স্ট্রিটলাইট বন্ধ। অন্ধকারে ছিনতাইয়ের ভয় আছে।', lat: 22.715, lng: 90.360, votes: 18, major: 'না', status: 'pending', reporter: 'সালমা খাতুন', reporterId: 'u_demo', date: new Date(Date.now()-2*86400000).toISOString(), photo: null, area: 'কাউনিয়া' },
    { id: 4, type: 'জলাবদ্ধতা', desc: 'রূপাতলীতে বৃষ্টি হলে হাঁটু পানি জমে যায়। ড্রেনেজ ব্যবস্থা একদম নেই।', lat: 22.700, lng: 90.380, votes: 55, major: 'না', status: 'pending', reporter: 'জামাল হোসেন', reporterId: 'u_demo', date: new Date(Date.now()-1*86400000).toISOString(), photo: null, area: 'রূপাতলী' },
    { id: 5, type: 'ড্রেন সমস্যা', desc: 'বগুড়া রোডের ড্রেন ভরা, দুর্গন্ধ ছড়াচ্ছে। স্বাস্থ্য ঝুঁকি তৈরি হচ্ছে।', lat: 22.710, lng: 90.375, votes: 12, major: 'না', status: 'done', reporter: 'নাছিমা আক্তার', reporterId: 'u_demo', date: new Date(Date.now()-20*86400000).toISOString(), photo: null, area: 'বগুড়া রোড' },
  ];
  saveIssues(demos);

  // Seed some comments
  const demoComments = [
    { id: 101, issueId: 1, userId: 'u_demo', userName: 'রাহেলা বেগম', text: 'এই গর্তে আমার বাইক পড়ে গেছে গত সপ্তাহে। দ্রুত ব্যবস্থা নিন।', date: new Date(Date.now()-4*86400000).toISOString(), likes: 8 },
    { id: 102, issueId: 1, userId: 'u_demo', userName: 'আবদুল করিম', text: 'আমিও প্রতিদিন এই রাস্তায় যাই। সত্যিই খুব বিপজ্জনক অবস্থা।', date: new Date(Date.now()-3*86400000).toISOString(), likes: 5 },
    { id: 103, issueId: 2, userId: 'u_demo', userName: 'করিম আহমেদ', text: 'কাল থেকে মেরামত শুরু হয়েছে বলে শুনলাম। সবাই ভোট দিন।', date: new Date(Date.now()-1*86400000).toISOString(), likes: 12 },
    { id: 104, issueId: 4, userId: 'u_demo', userName: 'জামাল হোসেন', text: 'এই সমস্যা ৩ বছর ধরে চলছে। সিটি কর্পোরেশনে কোনো সাড়া নেই।', date: new Date(Date.now()-12*3600000).toISOString(), likes: 20 },
  ];
  saveComments(demoComments);
}
