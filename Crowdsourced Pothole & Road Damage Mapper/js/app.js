/**
 * FixMyStreet বরিশাল — App Module (app.js)
 * Feed, issue list, detail, gov dashboard, UI helpers.
 */

let currentFeedFilter = 'all';
let currentListFilter = 'all';

// ─── TYPE HELPERS ─────────────────────────────────────────────────────────────
const TYPE_EMOJI = { 'গর্ত/পটহোল':'🕳️','ভাঙা রাস্তা':'🚧','জলাবদ্ধতা':'🌊','ভাঙা স্ট্রিটলাইট':'💡','ফাটল':'⚡','ড্রেন সমস্যা':'🪣','অন্যান্য':'⚠️' };
function getEmoji(type) { return TYPE_EMOJI[type] || '⚠️'; }

const STATUS_LABEL = { pending:'অমীমাংসিত', progress:'চলমান', done:'সম্পন্ন' };
const STATUS_CLASS = { pending:'status-pending', progress:'status-progress', done:'status-done' };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000);
  if (d > 0) return `${d} দিন আগে`;
  if (h > 0) return `${h} ঘণ্টা আগে`;
  if (m > 0) return `${m} মিনিট আগে`;
  return 'এইমাত্র';
}

// ─── SOCIAL FEED ──────────────────────────────────────────────────────────────
function renderFeed(filter) {
  if (filter !== undefined) currentFeedFilter = filter;
  let issues = sortByPriority(loadIssues());
  if (currentFeedFilter !== 'all') {
    issues = issues.filter(i => i.status === currentFeedFilter || i.type === currentFeedFilter);
  }
  const container = document.getElementById('feed-list');
  if (!issues.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><h3>কোনো পোস্ট নেই</h3><p>এই বিভাগে কোনো সমস্যা রিপোর্ট হয়নি।</p></div>`;
    return;
  }
  container.innerHTML = issues.map(issue => buildPostCard(issue)).join('');
}

function buildPostCard(issue) {
  const user    = getCurrentUser();
  const voted   = user && hasVoted(user.id, issue.id);
  const comments= getCommentsByIssue(issue.id);
  const score   = priorityScore(issue);
  const maxScore= 600;
  const pct     = Math.min(100, Math.round(score / maxScore * 100));

  return `
  <article class="post-card" id="post-${issue.id}">
    <div class="post-header">
      <div class="post-avatar">${getEmoji(issue.type)}</div>
      <div class="post-meta">
        <div class="post-author">${issue.reporter}</div>
        <div class="post-time"><span class="area-tag">${issue.area || 'বরিশাল'}</span> · ${timeAgo(issue.date)}</div>
      </div>
      <div class="post-status-badge ${STATUS_CLASS[issue.status]}">${STATUS_LABEL[issue.status]}</div>
    </div>

    <div class="post-type-label">${getEmoji(issue.type)} ${issue.type}</div>
    <p class="post-desc">${issue.desc}</p>

    ${issue.photo ? `<div class="post-photo-wrap"><img src="${issue.photo}" class="post-photo" alt="ছবি" loading="lazy"></div>` : ''}

    <div class="post-priority-bar">
      <span class="priority-label">অগ্রাধিকার স্কোর</span>
      <div class="pbar-track"><div class="pbar-fill" style="width:${pct}%"></div></div>
      <span class="priority-score">${score}</span>
    </div>

    <div class="post-actions">
      <button class="action-btn vote-btn${voted?' voted':''}" onclick="handleVote(${issue.id})">
        <svg viewBox="0 0 24 24" fill="${voted?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        <span>${issue.votes}</span>
        <span class="action-label">সমর্থন</span>
      </button>
      <button class="action-btn comment-toggle-btn" onclick="toggleComments(${issue.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>${comments.length}</span>
        <span class="action-label">মন্তব্য</span>
      </button>
      <button class="action-btn" onclick="shareIssue(${issue.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        <span class="action-label">শেয়ার</span>
      </button>
      <button class="action-btn detail-btn" onclick="openDetail(${issue.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span class="action-label">বিস্তারিত</span>
      </button>
    </div>

    <div class="comments-section" id="comments-${issue.id}" style="display:none">
      <div class="comments-list" id="comments-list-${issue.id}"></div>
      <div class="comment-input-row">
        <div class="comment-avatar">${getCurrentUser()?.avatar || '👤'}</div>
        <input class="comment-input" id="comment-input-${issue.id}" placeholder="মন্তব্য করুন..." onkeydown="if(event.key==='Enter')postComment(${issue.id})">
        <button class="comment-submit-btn" onclick="postComment(${issue.id})">পাঠান</button>
      </div>
    </div>
  </article>`;
}

function toggleComments(issueId) {
  const section = document.getElementById(`comments-${issueId}`);
  const isVisible = section.style.display !== 'none';
  if (isVisible) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  renderComments(issueId);
}

function renderComments(issueId) {
  const comments = getCommentsByIssue(issueId);
  const user = getCurrentUser();
  const container = document.getElementById(`comments-list-${issueId}`);
  if (!container) return;
  if (!comments.length) {
    container.innerHTML = '<div class="no-comments">প্রথম মন্তব্য করুন 💬</div>';
    return;
  }
  container.innerHTML = comments.map(c => {
    const liked = user && hasLikedComment(c.id, user.id);
    return `
    <div class="comment-item" id="comment-${c.id}">
      <div class="comment-ava">${c.userName.charAt(0)}</div>
      <div class="comment-body">
        <div class="comment-author">${c.userName} <span class="comment-time">${timeAgo(c.date)}</span></div>
        <div class="comment-text">${c.text}</div>
        <button class="comment-like-btn${liked?' liked':''}" onclick="handleLikeComment(${c.id},${issueId})">
          ❤️ ${c.likes || 0}
        </button>
      </div>
    </div>`;
  }).join('');
}

function postComment(issueId) {
  const user = getCurrentUser();
  if (!user) { showToast('মন্তব্য করতে লগইন করুন', 'error'); return; }
  const input = document.getElementById(`comment-input-${issueId}`);
  const text = input.value.trim();
  if (!text) return;
  addComment(issueId, user.id, user.name, text);
  input.value = '';
  renderComments(issueId);
  // Update comment count badge in post
  const btn = document.querySelector(`#post-${issueId} .comment-toggle-btn span`);
  if (btn) btn.textContent = getCommentsByIssue(issueId).length;
  // Notify issue reporter
  const issue = getIssueById(issueId);
  if (issue && issue.reporterId && issue.reporterId !== user.id) {
    addNotif(issue.reporterId, `${user.name} আপনার রিপোর্টে মন্তব্য করেছেন`);
    refreshNotifBadge();
  }
}

function handleLikeComment(commentId, issueId) {
  const user = getCurrentUser();
  if (!user) { showToast('লাইক দিতে লগইন করুন', 'error'); return; }
  likeComment(commentId, user.id);
  renderComments(issueId);
}

function handleVote(issueId) {
  const user = getCurrentUser();
  if (!user) { showToast('ভোট দিতে লগইন করুন', 'error'); return; }
  const ok = castVote(user.id, issueId);
  if (!ok) { showToast('আপনি ইতিমধ্যে ভোট দিয়েছেন', 'info'); return; }
  showToast('ভোট গণনা হয়েছে! ধন্যবাদ 👍', 'success');
  // Refresh this post card only
  const issue = getIssueById(issueId);
  if (issue) {
    const old = document.getElementById(`post-${issueId}`);
    if (old) old.outerHTML = buildPostCard(issue);
    // Re-open comments if they were open
  }
  renderMapMarkers();
  if (getIsGov()) renderGovTable();

  // Notify reporter
  if (issue && issue.reporterId && issue.reporterId !== user.id) {
    addNotif(issue.reporterId, `${user.name} আপনার রিপোর্টে ভোট দিয়েছেন`);
    refreshNotifBadge();
  }
}

function shareIssue(issueId) {
  const issue = getIssueById(issueId);
  const text = `FixMyStreet বরিশাল: ${issue.type} — ${issue.desc.slice(0,80)} | ভোট: ${issue.votes}`;
  if (navigator.share) {
    navigator.share({ title: 'FixMyStreet বরিশাল', text }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(text).then(() => showToast('লিঙ্ক কপি হয়েছে 📋', 'success'));
  }
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function openDetail(id) {
  const issue = getIssueById(id);
  if (!issue) return;
  const dateStr = new Date(issue.date).toLocaleString('bn-BD');
  document.getElementById('detail-content').innerHTML = `
    <h2>${getEmoji(issue.type)} ${issue.type}</h2>
    ${issue.photo ? `<img src="${issue.photo}" style="width:100%;border-radius:10px;margin-bottom:14px;max-height:220px;object-fit:cover">` : ''}
    <p style="color:var(--text-muted);margin-bottom:16px;line-height:1.6">${issue.desc}</p>
    <div class="detail-grid">
      <div><span class="detail-label">অবস্থা</span><strong class="${STATUS_CLASS[issue.status]}">${STATUS_LABEL[issue.status]}</strong></div>
      <div><span class="detail-label">ভোট</span><strong style="color:var(--primary)">${issue.votes}</strong></div>
      <div><span class="detail-label">রিপোর্টকারী</span><strong>${issue.reporter}</strong></div>
      <div><span class="detail-label">এলাকা</span><strong>${issue.area || 'অজানা'}</strong></div>
      <div><span class="detail-label">তারিখ</span><strong>${dateStr}</strong></div>
      <div><span class="detail-label">প্রধান সড়ক</span><strong>${issue.major}</strong></div>
      <div><span class="detail-label">অক্ষাংশ</span><strong>${issue.lat.toFixed(5)}</strong></div>
      <div><span class="detail-label">দ্রাঘিমাংশ</span><strong>${issue.lng.toFixed(5)}</strong></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn btn-primary btn-sm" onclick="closeModal('detail-modal');showPage('map-page');setTimeout(()=>{map && map.setView([${issue.lat},${issue.lng}],16)},300)">🗺️ মানচিত্রে দেখুন</button>
      <button class="btn btn-secondary btn-sm" onclick="handleVote(${issue.id});closeModal('detail-modal')">👍 সমর্থন করুন</button>
    </div>
  `;
  document.getElementById('detail-modal').classList.add('open');
}

// ─── ISSUES LIST (classic view) ───────────────────────────────────────────────
function filterIssues(filter, el) {
  currentListFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderIssuesList();
}

function renderIssuesList() {
  let issues = sortByPriority(loadIssues());
  if (currentListFilter !== 'all') {
    issues = issues.filter(i => i.status === currentListFilter || i.type === currentListFilter);
  }
  const container = document.getElementById('issues-list');
  if (!issues.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><h3>কোনো সমস্যা নেই</h3></div>`;
    return;
  }
  const user = getCurrentUser();
  container.innerHTML = issues.map((issue, idx) => {
    const voted = user && hasVoted(user.id, issue.id);
    const score = priorityScore(issue);
    const pClass = score > 300 ? 'priority-high' : score > 100 ? 'priority-medium' : 'priority-low';
    return `
    <div class="issue-card ${pClass}">
      <div class="priority-rank">🏆 #${idx+1} <span style="color:var(--primary);font-weight:700">${score}</span></div>
      <div class="vote-box">
        <div class="vote-count">${issue.votes}</div>
        <button class="vote-btn${voted?' voted':''}" onclick="handleVote(${issue.id})" title="${voted?'ভোট দেওয়া হয়েছে':'ভোট দিন'}">▲</button>
        <div class="vote-label">ভোট</div>
      </div>
      <div class="issue-content">
        <div class="issue-title">
          ${getEmoji(issue.type)} ${issue.type}
          <span class="status-badge ${STATUS_CLASS[issue.status]}">${STATUS_LABEL[issue.status]}</span>
        </div>
        <div class="issue-desc">${issue.desc.slice(0,120)}${issue.desc.length>120?'…':''}</div>
        <div class="issue-meta">
          <span class="meta-tag">📍 ${issue.area || 'বরিশাল'}</span>
          <span class="meta-tag">👤 ${issue.reporter}</span>
          <span class="meta-tag">💬 ${getCommentsByIssue(issue.id).length}</span>
          <span>${timeAgo(issue.date)}</span>
        </div>
        <div class="priority-bar">
          <div class="priority-bar-fill"><div class="priority-bar-inner" style="width:${Math.min(100,score/6)}%"></div></div>
        </div>
      </div>
      ${issue.photo ? `<img src="${issue.photo}" class="issue-thumb" onclick="openDetail(${issue.id})">` : ''}
    </div>`;
  }).join('');
}

// ─── GOVERNMENT DASHBOARD ─────────────────────────────────────────────────────
function renderGovStats() {
  const issues = loadIssues();
  const total  = issues.length;
  const pending= issues.filter(i=>i.status==='pending').length;
  const prog   = issues.filter(i=>i.status==='progress').length;
  const done   = issues.filter(i=>i.status==='done').length;
  const totalV = issues.reduce((s,i)=>s+i.votes,0);
  document.getElementById('gov-stats').innerHTML = `
    <div class="stat-card s1"><div class="stat-num">${total}</div><div class="stat-label">মোট সমস্যা</div></div>
    <div class="stat-card s2"><div class="stat-num">${pending}</div><div class="stat-label">অমীমাংসিত</div></div>
    <div class="stat-card s3"><div class="stat-num">${prog}</div><div class="stat-label">চলমান কাজ</div></div>
    <div class="stat-card s4"><div class="stat-num">${done}</div><div class="stat-label">সম্পন্ন</div></div>
    <div class="stat-card s5"><div class="stat-num">${totalV}</div><div class="stat-label">মোট ভোট</div></div>
  `;
}

function renderGovTable() {
  renderGovStats();
  const issues = sortByPriority(loadIssues());
  const tbody = document.getElementById('gov-table-body');
  if (!tbody) return;
  tbody.innerHTML = issues.map((issue, idx) => {
    const dateStr = new Date(issue.date).toLocaleDateString('bn-BD');
    const scoreColor = issue.votes>30?'var(--red)':issue.votes>10?'var(--yellow)':'var(--green)';
    return `
    <tr>
      <td><strong>#${idx+1}</strong></td>
      <td><span style="display:inline-flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:${scoreColor};display:inline-block"></span>${priorityScore(issue)}</span></td>
      <td>${getEmoji(issue.type)} ${issue.type}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${issue.desc}">${issue.desc}</td>
      <td style="font-size:0.78rem">${issue.lat.toFixed(4)}, ${issue.lng.toFixed(4)}<br><small style="color:var(--text-muted)">${issue.area||''}</small></td>
      <td>${issue.reporter}</td>
      <td><strong style="color:var(--primary)">${issue.votes}</strong></td>
      <td>${getCommentsByIssue(issue.id).length}</td>
      <td style="font-size:0.8rem">${dateStr}</td>
      <td>${issue.photo ? `<img src="${issue.photo}" class="table-photo" onclick="openDetail(${issue.id})">` : '<span style="color:var(--text-muted);font-size:0.75rem">নেই</span>'}</td>
      <td>
        <select class="status-select" onchange="updateStatus(${issue.id}, this.value)">
          <option value="pending"  ${issue.status==='pending'  ?'selected':''}>অমীমাংসিত</option>
          <option value="progress" ${issue.status==='progress' ?'selected':''}>চলমান</option>
          <option value="done"     ${issue.status==='done'     ?'selected':''}>সম্পন্ন</option>
        </select>
      </td>
      <td><button class="btn btn-red btn-sm" onclick="handleDeleteIssue(${issue.id})" style="padding:5px 10px;font-size:0.75rem">🗑️</button></td>
    </tr>`;
  }).join('');
}

function updateStatus(id, newStatus) {
  updateIssueStatus(id, newStatus);
  renderMapMarkers();
  renderIssuesList();
  renderFeed();
  renderGovStats();
  showToast('অবস্থা আপডেট: ' + STATUS_LABEL[newStatus], 'success');
}

function handleDeleteIssue(id) {
  if (!confirm('এই সমস্যা মুছে ফেলবেন?')) return;
  deleteIssue(id);
  renderGovTable();
  renderMapMarkers();
  renderIssuesList();
  renderFeed();
  showToast('সমস্যা মুছে ফেলা হয়েছে', 'info');
}

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
function downloadExcel() {
  const issues = sortByPriority(loadIssues());
  const rows = issues.map((issue, idx) => ({
    'ক্রম': idx+1,
    'অগ্রাধিকার স্কোর': priorityScore(issue),
    'সমস্যার ধরন': issue.type,
    'বিবরণ': issue.desc,
    'এলাকা': issue.area || '',
    'অক্ষাংশ': issue.lat,
    'দ্রাঘিমাংশ': issue.lng,
    'রিপোর্টকারী': issue.reporter,
    'ইমেইল': issue.reporterEmail || '',
    'ভোট': issue.votes,
    'মন্তব্য': getCommentsByIssue(issue.id).length,
    'প্রধান সড়ক': issue.major,
    'অবস্থা': STATUS_LABEL[issue.status],
    'রিপোর্টের তারিখ': new Date(issue.date).toLocaleDateString('bn-BD'),
    'ছবি আছে': issue.photo ? 'হ্যাঁ' : 'না'
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [8,16,16,40,14,12,12,16,24,10,10,12,14,20,10].map(w=>({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'সমস্যার তালিকা');

  const issues2 = loadIssues();
  const summaryData = [
    ['মোট সমস্যা', issues2.length],
    ['অমীমাংসিত', issues2.filter(i=>i.status==='pending').length],
    ['চলমান কাজ', issues2.filter(i=>i.status==='progress').length],
    ['সম্পন্ন', issues2.filter(i=>i.status==='done').length],
    ['মোট ভোট', issues2.reduce((s,i)=>s+i.votes,0)],
    ['মোট মন্তব্য', loadComments().length],
    ['রিপোর্ট তারিখ', new Date().toLocaleDateString('bn-BD')],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet([['বিবরণ','সংখ্যা'], ...summaryData]);
  ws2['!cols'] = [{wch:20},{wch:12}];
  XLSX.utils.book_append_sheet(wb, ws2, 'সারসংক্ষেপ');
  XLSX.writeFile(wb, `FixMyStreet_বরিশাল_${new Date().toISOString().split('T')[0]}.xlsx`);
  showToast('Excel ফাইল ডাউনলোড হচ্ছে...', 'success');
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) {
    const user = getCurrentUser();
    if (user) {
      markNotifsRead(user.id);
      refreshNotifBadge();
      renderNotifPanel();
    }
  }
}

function renderNotifPanel() {
  const user = getCurrentUser();
  if (!user) return;
  const notifs = loadNotifs(user.id);
  const container = document.getElementById('notif-list');
  if (!notifs.length) {
    container.innerHTML = '<div style="padding:16px;color:var(--text-muted);text-align:center;font-size:0.85rem">কোনো বিজ্ঞপ্তি নেই</div>';
    return;
  }
  container.innerHTML = notifs.slice(0,10).map(n => `
    <div class="notif-item${n.read?'':' unread'}">
      <div class="notif-msg">🔔 ${n.msg}</div>
      <div class="notif-time">${timeAgo(n.date)}</div>
    </div>`).join('');
}

// ─── FEED FILTER CHIPS ────────────────────────────────────────────────────────
function setFeedFilter(filter, el) {
  currentFeedFilter = filter;
  document.querySelectorAll('.feed-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderFeed();
}

// ─── PAGE NAVIGATION ──────────────────────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  const page = document.getElementById(pageId);
  if (pageId === 'map-page') page.style.display = 'flex';
  else page.style.display = 'block';
  page.classList.add('active');

  const tabMap = { 'feed-page':0, 'map-page':1, 'issues-page':2, 'gov-page':3 };
  const tabs = document.querySelectorAll('.nav-tab');
  if (tabs[tabMap[pageId]]) tabs[tabMap[pageId]].classList.add('active');

  if (pageId === 'map-page' && map) setTimeout(() => map.invalidateSize(), 150);
  if (pageId === 'feed-page')   renderFeed();
  if (pageId === 'issues-page') renderIssuesList();
  if (pageId === 'gov-page')    renderGovTable();
  document.getElementById('notif-panel').style.display = 'none';
}

function setMobileActive(el) {
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  seedDemoIssues();
  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  });
  // Close notif panel on outside click
  document.addEventListener('click', e => {
    const panel  = document.getElementById('notif-panel');
    const btn    = document.getElementById('notif-btn');
    if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
      panel.style.display = 'none';
    }
  });
});
