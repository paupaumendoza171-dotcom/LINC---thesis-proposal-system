'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data.json');
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const SESSION_COOKIE = 'linc_session';

const CATEGORIES = new Set([
  'academics',
  'campus-life',
  'wellbeing',
  'suggestions',
  'events',
  'other'
]);

const CATEGORY_LABELS = {
  academics: 'Academics',
  'campus-life': 'Campus life',
  wellbeing: 'Wellbeing',
  suggestions: 'Suggestions',
  events: 'Events',
  other: 'Other'
};

let db;

/* ------------------------------------------------------------------ */
/* Data helpers                                                       */
/* ------------------------------------------------------------------ */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, expected] = stored.split(':');
  try {
    const actual = crypto.scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expected, 'hex');
    return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
  } catch {
    return false;
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;
}

function iso(ms) {
  return new Date(ms).toISOString();
}

function loadDatabase() {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    db = {
      version: parsed.version || 1,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : []
    };
  } else {
    db = seedDatabase();
    saveDatabase();
  }

  const now = Date.now();
  const activeSessions = db.sessions.filter((session) => session.expiresAt > now);
  if (activeSessions.length !== db.sessions.length) {
    db.sessions = activeSessions;
    saveDatabase();
  }
}

function saveDatabase() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function seedDatabase() {
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  const users = [
    {
      id: 'usr_admin',
      role: 'admin',
      name: 'Ms. Elena Cruz',
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      createdAt: iso(now - 120 * DAY)
    },
    {
      id: 'usr_demo',
      role: 'student',
      name: 'Jamie Rivera',
      schoolId: '2024-00-000001',
      passwordHash: hashPassword('student123'),
      createdAt: iso(now - 90 * DAY)
    },
    {
      id: 'usr_maya',
      role: 'student',
      name: 'Maya Reyes',
      schoolId: '2024-00-000214',
      passwordHash: hashPassword('linc-demo-214'),
      createdAt: iso(now - 100 * DAY)
    },
    {
      id: 'usr_noah',
      role: 'student',
      name: 'Noah Santos',
      schoolId: '2024-00-000187',
      passwordHash: hashPassword('linc-demo-187'),
      createdAt: iso(now - 80 * DAY)
    },
    {
      id: 'usr_ava',
      role: 'student',
      name: 'Ava Lim',
      schoolId: '2023-00-000905',
      passwordHash: hashPassword('linc-demo-905'),
      createdAt: iso(now - 140 * DAY)
    },
    {
      id: 'usr_eli',
      role: 'student',
      name: 'Eli Cruz',
      schoolId: '2024-00-000342',
      passwordHash: hashPassword('linc-demo-342'),
      createdAt: iso(now - 60 * DAY)
    }
  ];

  const entries = [
    {
      id: 'ent_seed_01',
      userId: 'usr_maya',
      message:
        'The peer tutoring sessions on Thursday afternoons have genuinely changed how I study. If you are struggling with calculus, give them a try. The tutors explain things without making you feel behind.',
      category: 'academics',
      visibility: 'public',
      status: 'approved',
      createdAt: iso(now - 5 * HOUR),
      reviewedAt: iso(now - 4 * HOUR),
      reviewedBy: 'usr_admin',
      rejectionReason: ''
    },
    {
      id: 'ent_seed_02',
      userId: 'usr_ava',
      message:
        'To whoever needs to hear this: a bad week is not a bad life. You are allowed to ask for help, take a break, and try again tomorrow. The counseling office is open until 4 PM on weekdays.',
      category: 'wellbeing',
      visibility: 'anonymous',
      status: 'approved',
      createdAt: iso(now - 25 * HOUR),
      reviewedAt: iso(now - 23 * HOUR),
      reviewedBy: 'usr_admin',
      rejectionReason: ''
    },
    {
      id: 'ent_seed_03',
      userId: 'usr_noah',
      message:
        'Could we add more water refill stations near the gym and the east parking lot? The one by the cafeteria always has a line after practice, and bringing a bottle is supposed to make things easier, not harder.',
      category: 'suggestions',
      visibility: 'public',
      status: 'pending',
      createdAt: iso(now - 2 * HOUR),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: ''
    },
    {
      id: 'ent_seed_04',
      userId: 'usr_demo',
      message:
        'The second-floor library gets so quiet that even unzipping a bag feels illegal. Could we make one section a quiet-conversation zone? Sometimes we need to study together without whispering the whole time.',
      category: 'campus-life',
      visibility: 'anonymous',
      status: 'pending',
      createdAt: iso(now - 45 * 60 * 1000),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: ''
    },
    {
      id: 'ent_seed_05',
      userId: 'usr_eli',
      message:
        'A group of students keeps taking the same seats in the cafeteria and making comments about people from my old school. I know exactly who they are, but I do not want to put names here.',
      category: 'other',
      visibility: 'anonymous',
      status: 'rejected',
      createdAt: iso(now - 2 * DAY),
      reviewedAt: iso(now - 2 * DAY + 3 * HOUR),
      reviewedBy: 'usr_admin',
      rejectionReason:
        'This is important, but it needs a private conversation rather than a public post. Please speak with someone in student affairs so they can support you directly.'
    },
    {
      id: 'ent_seed_06',
      userId: 'usr_ava',
      message:
        'Club fair is this Friday at the courtyard! The robotics team is looking for new members, and yes, you can join even if you have never built anything before. Come say hi.',
      category: 'events',
      visibility: 'anonymous',
      status: 'approved',
      createdAt: iso(now - 2 * DAY - 2 * HOUR),
      reviewedAt: iso(now - 2 * DAY),
      reviewedBy: 'usr_admin',
      rejectionReason: ''
    },
    {
      id: 'ent_seed_07',
      userId: 'usr_noah',
      message:
        'Does anyone have notes from the WW2 history lecture on Tuesday? I was out sick and would really appreciate a copy. I can trade my biology flashcards.',
      category: 'academics',
      visibility: 'public',
      status: 'approved',
      createdAt: iso(now - 3 * DAY),
      reviewedAt: iso(now - 3 * DAY + 2 * HOUR),
      reviewedBy: 'usr_admin',
      rejectionReason: ''
    },
    {
      id: 'ent_seed_08',
      userId: 'usr_maya',
      message:
        'A quiet room during lunch for students who need a break from the noise would make a huge difference. Not everyone has a group to sit with, and that is okay.',
      category: 'suggestions',
      visibility: 'anonymous',
      status: 'approved',
      createdAt: iso(now - 4 * DAY),
      reviewedAt: iso(now - 4 * DAY + 5 * HOUR),
      reviewedBy: 'usr_admin',
      rejectionReason: ''
    },
    {
      id: 'ent_seed_09',
      userId: 'usr_eli',
      message:
        'Our coding club is hosting a beginner-friendly game jam next month. No experience needed, just bring a laptop and an idea. Would anyone be interested?',
      category: 'events',
      visibility: 'public',
      status: 'pending',
      createdAt: iso(now - 30 * 60 * 1000),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: ''
    },
    {
      id: 'ent_seed_10',
      userId: 'usr_demo',
      message:
        'Shoutout to Ms. Santos for staying after class to explain the lab report. I was completely lost and she drew the whole thing out for me. Small things like that matter.',
      category: 'academics',
      visibility: 'public',
      status: 'approved',
      createdAt: iso(now - 6 * HOUR),
      reviewedAt: iso(now - 5 * HOUR),
      reviewedBy: 'usr_admin',
      rejectionReason: ''
    },
    {
      id: 'ent_seed_11',
      userId: 'usr_demo',
      message:
        'I have been feeling pretty overwhelmed with college applications lately. Does anyone have a routine that helps them stop spiraling at night?',
      category: 'wellbeing',
      visibility: 'anonymous',
      status: 'pending',
      createdAt: iso(now - 15 * 60 * 1000),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: ''
    },
    {
      id: 'ent_seed_12',
      userId: 'usr_ava',
      message:
        'Reminder: the peer support club meets every Wednesday in room 204. You do not have to talk. You can just sit with us and drink tea.',
      category: 'wellbeing',
      visibility: 'public',
      status: 'approved',
      createdAt: iso(now - 1 * DAY - 3 * HOUR),
      reviewedAt: iso(now - 1 * DAY),
      reviewedBy: 'usr_admin',
      rejectionReason: ''
    },
    {
      id: 'ent_seed_13',
      userId: 'usr_maya',
      message:
        'The new late bus schedule is genuinely so helpful for students who stay for practice. Thank you to everyone who pushed for it.',
      category: 'campus-life',
      visibility: 'anonymous',
      status: 'approved',
      createdAt: iso(now - 6 * DAY),
      reviewedAt: iso(now - 6 * DAY + 4 * HOUR),
      reviewedBy: 'usr_admin',
      rejectionReason: ''
    }
  ];

  return {
    version: 1,
    users,
    entries,
    sessions: []
  };
}

/* ------------------------------------------------------------------ */
/* Session + response helpers                                         */
/* ------------------------------------------------------------------ */

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) {
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
    }
  }
  return cookies;
}

function currentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;

  const tokenHash = sha256(token);
  const session = db.sessions.find(
    (item) => item.tokenHash === tokenHash && item.expiresAt > Date.now()
  );
  if (!session) return null;

  return db.users.find((user) => user.id === session.userId) || null;
}

function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(
      SESSION_TTL / 1000
    )}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
  );
}

function createSession(user, res) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.sessions = db.sessions.filter((session) => session.expiresAt > now);
  db.sessions.push({
    tokenHash: sha256(token),
    userId: user.id,
    createdAt: iso(now),
    expiresAt: now + SESSION_TTL
  });
  saveDatabase();
  setSessionCookie(res, token);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function fail(res, status, message) {
  sendJson(res, status, { error: message });
}

function publicUser(user) {
  if (!user) return null;
  if (user.role === 'admin') {
    return {
      id: user.id,
      role: 'admin',
      name: user.name,
      username: user.username
    };
  }
  return {
    id: user.id,
    role: 'student',
    name: user.name,
    schoolId: user.schoolId
  };
}

function feedEntry(entry) {
  const author =
    entry.visibility === 'public' ? db.users.find((user) => user.id === entry.userId) : null;

  return {
    id: entry.id,
    message: entry.message,
    category: entry.category,
    visibility: entry.visibility,
    createdAt: entry.createdAt,
    author: author ? { name: author.name } : null
  };
}

function ownEntry(entry) {
  return {
    id: entry.id,
    message: entry.message,
    category: entry.category,
    visibility: entry.visibility,
    status: entry.status,
    createdAt: entry.createdAt,
    reviewedAt: entry.reviewedAt || null,
    rejectionReason: entry.rejectionReason || ''
  };
}

function adminEntry(entry) {
  const author = db.users.find((user) => user.id === entry.userId);
  return {
    id: entry.id,
    message: entry.message,
    category: entry.category,
    visibility: entry.visibility,
    status: entry.status,
    createdAt: entry.createdAt,
    reviewedAt: entry.reviewedAt || null,
    rejectionReason: entry.rejectionReason || '',
    author: author
      ? {
          id: author.id,
          name: author.name,
          schoolId: author.schoolId
        }
      : null
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 32 * 1024) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(parsed && typeof parsed === 'object' ? parsed : {});
      } catch {
        reject(Object.assign(new Error('Please send valid JSON.'), { status: 400 }));
      }
    });

    req.on('error', reject);
  });
}

function normalizeText(value) {
  return String(value == null ? '' : value)
    .replace(/\r\n/g, '\n')
    .trim();
}

function validSchoolId(value) {
  return /^\d{4}-\d{2}-\d{6}$/.test(value);
}

function validPassword(value) {
  return (
    typeof value === 'string' &&
    value.length >= 8 &&
    value.length <= 72 &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value)
  );
}

/* ------------------------------------------------------------------ */
/* API                                                               */
/* ------------------------------------------------------------------ */

async function handleApi(req, res, url) {
  const method = req.method || 'GET';
  const pathname = url.pathname;
  const user = currentUser(req);

  if (method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (method === 'GET' && pathname === '/api/me') {
    return sendJson(res, 200, { user: user ? publicUser(user) : null });
  }

  if (method === 'POST' && pathname === '/api/register') {
    const body = await readJsonBody(req);
    const name = normalizeText(body.name).replace(/\s+/g, ' ');
    const schoolId = normalizeText(body.schoolId);
    const password = typeof body.password === 'string' ? body.password : '';

    if (name.length < 2 || name.length > 60) {
      return fail(res, 400, 'Please enter your full name.');
    }
    if (!validSchoolId(schoolId)) {
      return fail(res, 400, 'Your school ID should look like 2024-00-000672.');
    }
    if (db.users.some((item) => item.schoolId === schoolId)) {
      return fail(res, 409, 'An account with that school ID already exists.');
    }
    if (!validPassword(password)) {
      return fail(res, 400, 'Use at least 8 characters with a letter and a number.');
    }

    const newUser = {
      id: newId('usr'),
      role: 'student',
      name,
      schoolId,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDatabase();
    createSession(newUser, res);
    return sendJson(res, 201, { user: publicUser(newUser) });
  }

  if (method === 'POST' && pathname === '/api/login') {
    const body = await readJsonBody(req);
    const role = body.role === 'admin' ? 'admin' : 'student';
    const identifier = normalizeText(body.identifier);
    const password = typeof body.password === 'string' ? body.password : '';

    let account = null;
    if (role === 'admin') {
      account = db.users.find(
        (item) =>
          item.role === 'admin' &&
          String(item.username).toLowerCase() === identifier.toLowerCase()
      );
    } else {
      account = db.users.find((item) => item.role === 'student' && item.schoolId === identifier);
    }

    if (!account || !verifyPassword(password, account.passwordHash)) {
      return fail(
        res,
        401,
        role === 'admin'
          ? 'Incorrect administrator username or password.'
          : 'Incorrect school ID or password.'
      );
    }

    createSession(account, res);
    return sendJson(res, 200, { user: publicUser(account) });
  }

  if (method === 'POST' && pathname === '/api/logout') {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (token) {
      const tokenHash = sha256(token);
      db.sessions = db.sessions.filter((session) => session.tokenHash !== tokenHash);
      saveDatabase();
    }
    clearSessionCookie(res);
    return sendJson(res, 200, { ok: true });
  }

  if (method === 'GET' && pathname === '/api/entries') {
    if (!user) return fail(res, 401, 'Please sign in first.');
    const scope = url.searchParams.get('scope') || 'feed';

    if (scope === 'mine') {
      if (user.role !== 'student') return fail(res, 403, 'This area is for students.');
      const entries = db.entries
        .filter((entry) => entry.userId === user.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(ownEntry);
      return sendJson(res, 200, { entries });
    }

    const entries = db.entries
      .filter((entry) => entry.status === 'approved')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(feedEntry);
    return sendJson(res, 200, { entries });
  }

  if (method === 'POST' && pathname === '/api/entries') {
    if (!user) return fail(res, 401, 'Please sign in first.');
    if (user.role !== 'student') return fail(res, 403, 'Only student accounts can submit entries.');

    const body = await readJsonBody(req);
    const message = normalizeText(body.message);
    const category = normalizeText(body.category);
    const visibility = normalizeText(body.visibility);

    if (message.length < 10) {
      return fail(res, 400, 'Please write at least 10 characters.');
    }
    if (message.length > 500) {
      return fail(res, 400, 'Entries can be up to 500 characters.');
    }
    if (!CATEGORIES.has(category)) {
      return fail(res, 400, 'Please choose a category.');
    }
    if (!['anonymous', 'public'].includes(visibility)) {
      return fail(res, 400, 'Please choose how your entry should be shown.');
    }

    const entry = {
      id: newId('ent'),
      userId: user.id,
      message,
      category,
      visibility,
      status: 'pending',
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: ''
    };
    db.entries.push(entry);
    saveDatabase();
    return sendJson(res, 201, { entry: ownEntry(entry) });
  }

  if (method === 'GET' && pathname === '/api/admin/entries') {
    if (!user) return fail(res, 401, 'Please sign in first.');
    if (user.role !== 'admin') return fail(res, 403, 'Administrator access only.');

    const entries = [...db.entries]
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
      .map(adminEntry);

    const students = db.users.filter((item) => item.role === 'student');
    const stats = {
      totalStudents: students.length,
      total: db.entries.length,
      pending: db.entries.filter((entry) => entry.status === 'pending').length,
      approved: db.entries.filter((entry) => entry.status === 'approved').length,
      rejected: db.entries.filter((entry) => entry.status === 'rejected').length
    };

    return sendJson(res, 200, { entries, stats });
  }

  const adminEntryMatch = pathname.match(/^\/api\/admin\/entries\/([A-Za-z0-9_-]+)$/);
  if (method === 'PATCH' && adminEntryMatch) {
    if (!user) return fail(res, 401, 'Please sign in first.');
    if (user.role !== 'admin') return fail(res, 403, 'Administrator access only.');

    const entry = db.entries.find((item) => item.id === adminEntryMatch[1]);
    if (!entry) return fail(res, 404, 'That entry could not be found.');

    const body = await readJsonBody(req);
    const status = normalizeText(body.status);
    const rejectionReason = normalizeText(body.rejectionReason).slice(0, 300);

    if (!['approved', 'rejected'].includes(status)) {
      return fail(res, 400, 'Choose either approved or rejected.');
    }
    if (status === 'rejected' && rejectionReason.length > 300) {
      return fail(res, 400, 'The review note can be up to 300 characters.');
    }

    entry.status = status;
    entry.reviewedAt = new Date().toISOString();
    entry.reviewedBy = user.id;
    entry.rejectionReason = status === 'rejected' ? rejectionReason : '';
    saveDatabase();

    return sendJson(res, 200, { entry: adminEntry(entry) });
  }

  return fail(res, 404, 'API route not found.');
}

/* ------------------------------------------------------------------ */
/* Static files                                                      */
/* ------------------------------------------------------------------ */

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function serveStatic(req, res, url) {
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method not allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad request');
  }

  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(PUBLIC_DIR, `.${pathname}`);

  if (filePath !== PUBLIC_DIR && !filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin'
    });

    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ------------------------------------------------------------------ */
/* Server                                                            */
/* ------------------------------------------------------------------ */

loadDatabase();

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, url);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        fail(res, error.status || 500, error.status ? error.message : 'Something went wrong. Please try again.');
      } else {
        res.end();
      }
    }
    return;
  }

  serveStatic(req, res, url);
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  LINC is running.');
  console.log(`  Open http://${HOST}:${PORT}`);
  console.log('');
  console.log('  Demo student: 2024-00-000001 / student123');
  console.log('  Demo admin:   admin / admin123');
  console.log('');
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
