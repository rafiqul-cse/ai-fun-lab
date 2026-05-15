/**
 * FixMyStreet বরিশাল — Auth Module (auth.js)
 * Handles login, register, gov login, session state.
 */

let currentUser = null;
let isGov = false;

function getCurrentUser() { return currentUser; }
function getIsGov()       { return isGov; }

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) =>
    t.classList.toggle('active', (i===0 && tab==='login') || (i===1 && tab==='register')));
  document.getElementById('login-form').style.display   = tab === 'login'    ? 'block' : 'none';
  document.getElementById('register-form').style.display= tab === 'register' ? 'block' : 'none';
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('ইমেইল ও পাসওয়ার্ড প্রয়োজন', 'error'); return; }
  const res = loginUser(email, pass);
  if (!res.ok) { showToast(res.msg, 'error'); return; }
  currentUser = res.user; isGov = false;
  enterApp();
}

function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const area  = document.getElementById('reg-area').value;
  if (!name || !email || !pass || !area) { showToast('সব তথ্য পূরণ করুন', 'error'); return; }
  const res = registerUser({ name, email, phone, pass, area });
  if (!res.ok) { showToast(res.msg, 'error'); return; }
  currentUser = res.user; isGov = false;
  showToast('নিবন্ধন সফল হয়েছে! স্বাগতম 🎉', 'success');
  enterApp();
}

function showGovLogin() {
  document.getElementById('gov-login-modal').classList.add('open');
}

function doGovLogin() {
  const id   = document.getElementById('gov-id').value.trim();
  const pass = document.getElementById('gov-pass').value;
  if (id === 'GOV-001' && pass === 'admin123') {
    currentUser = { id: 'gov_001', name: 'সরকারি কর্মকর্তা', email: 'gov@bcc.gov.bd', avatar: '🏛️' };
    isGov = true;
    closeModal('gov-login-modal');
    enterApp();
  } else {
    showToast('ভুল কর্মকর্তা আইডি বা পাসওয়ার্ড', 'error');
  }
}

function enterApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('mobile-nav').style.display = 'flex';

  // Populate navbar
  document.getElementById('nav-user-name').textContent = currentUser.name;
  document.getElementById('nav-badge').textContent = isGov ? '🏛️ সরকার' : '👤 নাগরিক';
  document.getElementById('nav-badge').className = 'nav-badge' + (isGov ? ' gov' : '');

  // Update notification badge
  refreshNotifBadge();

  if (isGov) {
    document.getElementById('gov-tab').style.display = 'block';
    document.getElementById('mob-gov-btn').style.display = 'flex';
  }

  initMap();
  showPage('feed-page');
  showToast('স্বাগতম, ' + currentUser.name + '! 👋', 'success');
}

function logout() {
  currentUser = null; isGov = false;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('mobile-nav').style.display = 'none';
  document.getElementById('gov-tab').style.display = 'none';
  document.getElementById('mob-gov-btn').style.display = 'none';
}

function refreshNotifBadge() {
  if (!currentUser) return;
  const unread = loadNotifs(currentUser.id).filter(n => !n.read).length;
  const badge = document.getElementById('notif-badge');
  if (badge) { badge.textContent = unread > 0 ? unread : ''; badge.style.display = unread > 0 ? 'flex' : 'none'; }
}
