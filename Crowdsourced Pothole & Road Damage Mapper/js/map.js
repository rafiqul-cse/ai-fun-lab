/**
 * FixMyStreet বরিশাল — Map Module (map.js)
 * Leaflet map init, markers, pin mode.
 */

let map = null;
let markersLayer = [];
let pinMode = false;
let pendingLatLng = null;

function initMap() {
  if (map) { setTimeout(() => map.invalidateSize(), 150); return; }
  map = L.map('map').setView([22.7010, 90.3535], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  renderMapMarkers();
  map.on('click', onMapClick);
}

function getMarkerColor(status) {
  return { pending: '#e85d04', progress: '#4cc9f0', done: '#2dc653' }[status] || '#e85d04';
}

function makeIcon(status, votes) {
  const color = getMarkerColor(status);
  const size  = Math.min(44, 28 + Math.floor(votes / 5) * 2);
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:${size}px;height:${size}px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 3px 12px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:${Math.floor(size*0.4)}px;line-height:1">${getTypeEmoji(null, status)}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size]
  });
}

function getTypeEmoji(type, status) {
  const map = { 'গর্ত/পটহোল':'🕳️','ভাঙা রাস্তা':'🚧','জলাবদ্ধতা':'🌊','ভাঙা স্ট্রিটলাইট':'💡','ফাটল':'⚡','ড্রেন সমস্যা':'🪣','অন্যান্য':'⚠️' };
  return type ? (map[type] || '⚠️') : (status === 'done' ? '✅' : status === 'progress' ? '🔧' : '⚠️');
}

async function renderMapMarkers() {
  // 1. Clear old markers
  markersLayer.forEach(m => map.removeLayer(m));
  markersLayer = [];

  // 2. Fetch issues from Supabase (using the function in db.js)
  const issues = await loadIssues(); 

  // 3. Draw markers only if we have data
  if (!issues || issues.length === 0) {
    console.log("No issues found in Supabase yet.");
    return;
  }

  issues.forEach(issue => {
    // Note: Use issue.latitude/longitude based on your Supabase column names
    const marker = L.marker([issue.lat, issue.lng], {
      icon: makeIcon(issue.status, issue.votes || 0)
    }).addTo(map);

    // Keep your existing popup logic here...
    markersLayer.push(marker);
  });
}

function filterMapMarkers(filter) {
  renderMapMarkers(filter);
  document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

function startPinMode() {
  if (!getCurrentUser()) { showToast('প্রথমে লগইন করুন', 'error'); return; }
  pinMode = true;
  map.getContainer().style.cursor = 'crosshair';
  document.getElementById('pin-hint').style.display = 'flex';
  showPage('map-page');
}

function onMapClick(e) {
  if (!pinMode) return;
  pendingLatLng = e.latlng;
  document.getElementById('r-location').value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
  pinMode = false;
  map.getContainer().style.cursor = '';
  document.getElementById('pin-hint').style.display = 'none';

  // Show temp marker
  const tmp = L.marker(e.latlng, {
    icon: L.divIcon({ className:'', html:'<div style="background:#ffd60a;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>', iconSize:[24,24], iconAnchor:[12,12] })
  }).addTo(map);
  setTimeout(() => map.removeLayer(tmp), 5000);

  document.getElementById('report-modal').classList.add('open');
}

function submitReport() {
  if (!pendingLatLng) { showToast('মানচিত্রে একটি স্থান বেছে নিন', 'error'); return; }
  const type  = document.getElementById('r-type').value;
  const desc  = document.getElementById('r-desc').value.trim();
  const major = document.getElementById('r-major').value;
  if (!desc) { showToast('সমস্যার বিবরণ লিখুন', 'error'); return; }

  const photoInput = document.getElementById('r-photo');
  let photoData = null;
  const reader = new FileReader();

  // Change this line to include 'async'
const finalize = async () => { 
    const user = getCurrentUser();
    
    // Add 'await' before addIssue
    try {
        await addIssue({
          type, desc,
          lat: pendingLatLng.lat,
          lng: pendingLatLng.lng,
          major,
          reporter: user.name,
          area: user.area || '',
        });

        // The rest of your existing code...
        pendingLatLng = null;
        closeModal('report-modal');
        showToast('রিপোর্ট সফলভাবে জমা হয়েছে!', 'success');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
};
    pendingLatLng = null;
    document.getElementById('r-desc').value = '';
    document.getElementById('r-photo').value = '';
    document.getElementById('photo-preview').style.display = 'none';
    closeModal('report-modal');
    renderMapMarkers();
    renderFeed();
    showToast('রিপোর্ট সফলভাবে জমা হয়েছে! ধন্যবাদ 🎉', 'success');
  };

  if (photoInput.files[0]) {
    reader.onload = e => { photoData = e.target.result; finalize(); };
    reader.readAsDataURL(photoInput.files[0]);
  } else {
    finalize();
  }
}

function previewPhoto(input) {
  const preview = document.getElementById('photo-preview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
    reader.readAsDataURL(input.files[0]);
  }
}
