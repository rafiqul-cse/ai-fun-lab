# FixMyStreet বরিশাল 🛣️

A social-media-style civic road issue reporting platform for Barishal, Bangladesh.

## Project Structure

```
fixmystreet/
├── index.html          ← Main HTML entry point
├── css/
│   └── style.css       ← All styles (variables, layout, components)
├── js/
│   ├── auth.js         ← Login, register, session management
│   ├── map.js          ← Leaflet map, markers, pin mode
│   └── app.js          ← Feed, comments, voting, gov dashboard, UI helpers
└── data/
    └── db.js           ← Data layer: localStorage CRUD, seed data, priority score
```

## Features

### 🏠 Social Feed (New!)
- Post cards with upvote, comment, share buttons
- Inline comment threads with like support
- Priority progress bar per post
- Real-time comment count badges
- Filter by status or issue type

### 🗺️ Map
- Leaflet.js interactive map centered on Barishal
- Click-to-pin new issue reports
- Dynamic marker sizes based on vote count
- Filter markers by status
- Custom styled popups

### 📋 Issues List
- Max-Heap priority sorting (votes × 10 + road bonus + age bonus)
- Filter chips by status / type
- Thumbnail images, comment counts

### 🏛️ Government Dashboard
- Live stats grid (total, pending, in-progress, done, total votes)
- Priority-sorted data table
- Status dropdown to update issues
- Delete issues
- Excel export (2 sheets: issues + summary)

### 🔔 Notifications
- In-app notification bell with unread badge
- Reporters get notified when someone votes or comments on their issue

## Demo Credentials
- **Citizen:** `demo@example.com` / `123456`
- **Government:** ID=`GOV-001` / Password=`admin123`

## Running Locally
Just open `index.html` in a browser. No server needed — all data is stored in `localStorage`.
