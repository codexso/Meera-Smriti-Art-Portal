const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Explicit License Route (Handles /soham directly)
app.get('/soham', (req, res) => {
  const licensePath = path.join(__dirname, 'public', 'soham');
  res.sendFile(licensePath, (err) => {
    if (err) {
      console.error('❌ Failed to serve /soham:', err.message);
      res.status(404).json({ error: 'License file public/soham not found' });
    }
  });
});

// Serve Static Assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// Connect / Auto-create Database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('❌ Database connection error:', err);
  else console.log('✅ Connected to SQLite database server.');
});

// Auto-run schema creation on server boot
require('./setup-db');

// ================= API ENDPOINTS ================= //

// User Registration
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
  db.run(query, [name, email, password], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Email is already registered.' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, userId: this.lastID, name, email });
  });
});

// User Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const query = `SELECT id, name, email, role FROM users WHERE email = ? AND password = ?`;
  
  db.get(query, [email, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid email or password.' });
    res.json({ success: true, user: row });
  });
});

// Submit New Admission Form
app.post('/api/admissions', (req, res) => {
  const { student_name, guardian_name, age, phone, email, branch, course } = req.body;
  
  if (!student_name || !guardian_name || !phone || !branch || !course) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  const query = `
    INSERT INTO admissions (student_name, guardian_name, age, phone, email, branch, course)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [student_name, guardian_name, age, phone, email, branch, course], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, admissionId: this.lastID });
  });
});

// Admin: Get All Admissions
app.get('/api/admin/admissions', (req, res) => {
  const query = `SELECT * FROM admissions ORDER BY created_at DESC`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ admissions: rows });
  });
});

// Admin: Update Admission Status (APPROVED / REJECTED)
app.post('/api/admin/status', (req, res) => {
  const { id, status } = req.body;
  const query = `UPDATE admissions SET status = ? WHERE id = ?`;

  db.run(query, [status, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, updated: this.changes });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Meera Smriti GitHub Express Server live at: http://localhost:${PORT}`);
  console.log(`👑 Admin Dashboard accessible at: http://localhost:${PORT}/admin.html`);
});