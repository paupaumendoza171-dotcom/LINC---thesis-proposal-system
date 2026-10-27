# LINC — a moderated student community wall

LINC is a full-stack student community website built with **HTML, CSS, and vanilla JavaScript**, with a small **Node.js** server for real accounts, sessions, and persistent data.

Students can create an account with their school ID, submit entries anonymously or publicly, choose a category, track approval status, and search the wall by keyword. Administrators get a separate review desk where they can inspect the real author behind an anonymous entry, approve it, or reject it with a note.

## Quick start

1. Make sure Node.js 18 or newer is installed.
2. Open a terminal in this folder.
3. Run:

```bash
npm start
```

4. Open **http://127.0.0.1:3000**

On Windows, you can also double-click `start.bat`.

No `npm install` is required — the project has zero third-party dependencies.

## Demo accounts

| Role | Credentials |
| --- | --- |
| Student | School ID `2024-00-000001` · password `student123` |
| Administrator | Username `admin` · password `admin123` |

The login screen also has a **Use demo** shortcut for both roles.

## What is included

### Student side

- Account registration with a validated school ID format (`2024-00-000672`)
- Password creation, confirmation, strength feedback, and show/hide controls
- Secure password hashing with Node's `scrypt`
- Session-based login using an HttpOnly cookie
- Anonymous or public entry visibility
- Six content categories: Academics, Campus life, Wellbeing, Suggestions, Events, Other
- 500-character entry composer with a live counter
- Entries enter a moderation queue before appearing publicly
- “My entries” page with pending / approved / rejected status
- Rejection notes shown directly to the student
- Keyword search across entry content, category, and public author names
- Responsive desktop, tablet, and mobile layouts

### Admin side

- Separate administrator login
- Review desk with pending, approved, rejected, and all-entry views
- Approve or reject entries
- Reject with an optional note that the student can read
- Search by entry content, student name, or school ID
- Filter by category
- Real author identity visible for anonymous entries, with a clear “Anonymous to public” label
- Live queue counts and summary statistics

## Project structure

```text
LINC/
├── public/
│   ├── index.html      # Page shell and inline SVG icon set
│   ├── styles.css      # Complete responsive design system
│   ├── app.js          # SPA routing, UI, validation, API calls
│   └── favicon.svg
├── server.js           # Zero-dependency HTTP server + JSON API
├── package.json
├── start.bat           # Optional Windows launcher
└── README.md
```

`data.json` is created automatically the first time the server starts. It is ignored by Git and stores users, entries, and sessions.

## Resetting the demo

Stop the server, delete `data.json`, and run `npm start` again. The original seed users and entries will be recreated.

## Changing the seeded admin password

The demo admin is created in `seedDatabase()` inside `server.js`. Change the `admin123` value before starting the server for the first time, or delete `data.json` and restart after editing it.

For a real deployment, replace the seeded administrator with an environment-variable-based account and use a proper database.

## Notes before using this with real students

This project is a complete local prototype, but it is intentionally dependency-free and stores data in a local JSON file. Before deploying it for real use:

- Serve it over HTTPS
- Move users, entries, and sessions into a proper database
- Add rate limiting and CSRF protection
- Replace the demo accounts and credentials
- Add an audit trail for moderation decisions
- Review your school's privacy, consent, and safeguarding policies

## Tech

- HTML5
- CSS custom properties, Grid, Flexbox, container-aware responsive rules
- Vanilla JavaScript SPA with hash routing
- Node.js built-in `http`, `crypto`, and `fs` modules
- Local JSON persistence
