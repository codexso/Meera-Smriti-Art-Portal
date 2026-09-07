const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/login', limiter);
app.use('/api/admin/verify', limiter);

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error("Database error:", err.message);
    else console.log("Connected to SQLite database securely.");
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS admissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_name TEXT,
        guardian_name TEXT,
        age INTEGER,
        phone TEXT,
        email TEXT,
        branch TEXT,
        course TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_number TEXT UNIQUE,
        student_name TEXT,
        status TEXT
    )`);

    db.get(`SELECT * FROM licenses WHERE license_number = ?`, ['SOHAM-2026-001'], (err, row) => {
        if (!row) {
            db.run(`INSERT INTO licenses (license_number, student_name, status) VALUES (?, ?, ?)`, 
                ['SOHAM-2026-001', 'Soham Basu', 'Active & Verified']);
        }
    });
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required.' });
        if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, 
            [name, email, hashedPassword, 'user'], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) return res.status(400).json({ error: 'Email is already registered.' });
                return res.status(500).json({ error: 'Database error during registration.' });
            }
            res.json({ success: true, message: 'Account created successfully.' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid email or password.' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
        res.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
    });
});

app.post('/api/admissions', (req, res) => {
    const { student_name, guardian_name, age, phone, email, branch, course } = req.body;
    if (!student_name || !guardian_name || !age || !phone || !email || !branch || !course) {
        return res.status(400).json({ error: 'All admission fields are required.' });
    }

    db.run(`INSERT INTO admissions (student_name, guardian_name, age, phone, email, branch, course) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [student_name, guardian_name, age, phone, email, branch, course], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to save admission record.' });
        res.json({ success: true, admissionId: this.lastID });
    });
});

app.post('/api/admin/verify', (req, res) => {
    const { passcode } = req.body;
    if (passcode === 'Money@220077') {
        const token = crypto.randomBytes(32).toString('hex');
        return res.json({ success: true, token });
    }
    res.status(401).json({ error: 'Incorrect admin passcode.' });
});

app.post('/api/verify-license', (req, res) => {
    const { licenseNumber } = req.body;
    if (!licenseNumber) return res.status(400).json({ error: 'License number is required.' });

    db.get(`SELECT * FROM licenses WHERE license_number = ?`, [licenseNumber], (err, row) => {
        if (row) {
            res.json({ success: true, student: row.student_name, status: row.status });
        } else {
            res.status(404).json({ success: false, error: 'License key not found or invalid.' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});