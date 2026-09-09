import express from 'express';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'meera_smriti_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SQLite Database Setup
const db = new Database('academy.db');
db.pragma('journal_mode = WAL');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL,
    author TEXT DEFAULT 'Admin'
  );

  CREATE TABLE IF NOT EXISTS admissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT NOT NULL,
    dob TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    course TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Default Admin Account (admin / admin123)
const seedAdmin = () => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!user) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
    console.log('Default Admin Account Created: username "admin", password "admin123"');
  }
};
seedAdmin();

// Seed Initial Notices
const seedNotices = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM notices').get().count;
  if (count === 0) {
    const stmt = db.prepare('INSERT INTO notices (title, content, date, author) VALUES (?, ?, ?, ?)');
    stmt.run('Annual Fine Arts Exhibition 2026', 'Registration is now open for all senior diploma candidates. Canvas submissions deadline is Sept 30.', 'Sept 8, 2026', 'Examination Cell');
    stmt.run('Monthly Vocal & Instrumental Practical Assessment', 'Monthly evaluations begin next week. Check the exam schedule page for individual slots.', 'Sept 5, 2026', 'Academic Admin');
  }
};
seedNotices();

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

/* API ROUTES */

// 1. Admin Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Fetch Notices
app.get('/api/notices', (req, res) => {
  try {
    const notices = db.prepare('SELECT * FROM notices ORDER BY id DESC').all();
    res.json(notices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Create Notice (Admin Only)
app.post('/api/notices', authenticateToken, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });

  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const author = req.user.username || 'Admin';

  try {
    const stmt = db.prepare('INSERT INTO notices (title, content, date, author) VALUES (?, ?, ?, ?)');
    const info = stmt.run(title, content, date, author);
    res.json({ id: info.lastInsertRowid, title, content, date, author });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete Notice (Admin Only)
app.delete('/api/notices/:id', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM notices WHERE id = ?');
    const result = stmt.run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Notice not found.' });
    res.json({ message: 'Notice deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Submit Admission Form
app.post('/api/admissions', (req, res) => {
  const { fullname, dob, email, phone, course, address } = req.body;
  if (!fullname || !email || !course) return res.status(400).json({ error: 'Required fields missing.' });

  try {
    const stmt = db.prepare('INSERT INTO admissions (fullname, dob, email, phone, course, address) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(fullname, dob, email, phone, course, address);
    res.json({ success: true, id: info.lastInsertRowid, message: 'Application submitted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Submit Contact Form
app.post('/api/contacts', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Required fields missing.' });

  try {
    const stmt = db.prepare('INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)');
    stmt.run(name, email, subject || 'General Query', message);
    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to single-page fallback for frontend HTML routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});