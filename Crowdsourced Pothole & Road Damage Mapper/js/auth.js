/**
 * FixMyStreet বরিশাল — Auth Module (auth.js)
 * Handles Supabase Authentication & Session State.
 */

let currentUser = null;
let isGov = false;

// Note: We use async here because we might need to fetch the session
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = {
            id: session.user.id,
            name: session.user.user_metadata.full_name || 'নাগরিক',
            email: session.user.email,
            avatar: '👤'
        };
        // Basic check for Gov (In a real app, use roles or metadata)
        isGov = session.user.email.endsWith('.gov.bd'); 
        enterApp();
    }
}

function getCurrentUser() { return currentUser; }
function getIsGov()       { return isGov; }

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach((t, i) =>
        t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register')));
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
}

/** REAL SUPABASE LOGIN */
async function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;

    if (!email || !pass) { showToast('ইমেইল ও পাসওয়ার্ড প্রয়োজন', 'error'); return; }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: pass,
        });

        if (error) throw error;

        currentUser = {
            id: data.user.id,
            name: data.user.user_metadata.full_name || 'নাগরিক',
            email: data.user.email
        };
        isGov = email.endsWith('.gov.bd'); // Simple logic for demo
        
        enterApp();
    } catch (err) {
        showToast('ভুল ইমেইল বা পাসওয়ার্ড', 'error');
    }
}

/** REAL SUPABASE REGISTRATION */
async function doRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const area = document.getElementById('reg-area').value;

    if (!name || !email || !pass || !area) { showToast('সব তথ্য পূরণ করুন', 'error'); return; }

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: pass,
            options: {
                data: {
                    full_name: name,
                    area: area
                }
            }
        });

        if (error) throw error;

        showToast('নিবন্ধন সফল হয়েছে! ইমেইল চেক করুন। 🎉', 'success');
        // Supabase often requires email confirmation before login
        if (data.user) {
            currentUser = { id: data.user.id, name, email };
            enterApp();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function showGovLogin() {
    document.getElementById('gov-login-modal').classList.add('open');
}

/** GOV LOGIN (Keeping it hardcoded for your specific requirement) */
function doGovLogin() {
    const id = document.getElementById('gov-id').value.trim();
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

    document.getElementById('nav-user-name').textContent = currentUser.name;
    document.getElementById('nav-badge').textContent = isGov ? '🏛️ সরকার' : '👤 নাগরিক';
    document.getElementById('nav-badge').className = 'nav-badge' + (isGov ? ' gov' : '');

    if (isGov) {
        document.getElementById('gov-tab').style.display = 'block';
        document.getElementById('mob-gov-btn').style.display = 'flex';
    }

    // Since we are now using Supabase, we refresh map markers from the cloud
    initMap();
    showPage('feed-page');
    showToast('স্বাগতম, ' + currentUser.name + '! 👋', 'success');
}

/** REAL SUPABASE LOGOUT */
async function logout() {
    await supabase.auth.signOut();
    currentUser = null; 
    isGov = false;
    
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('mobile-nav').style.display = 'none';
    document.getElementById('gov-tab').style.display = 'none';
    document.getElementById('mob-gov-btn').style.display = 'none';
}

// Check if user is already logged in when the page loads
window.addEventListener('DOMContentLoaded', checkSession);
