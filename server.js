const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Headers Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Set to false to allow inline scripts in frontend if needed
    crossOriginEmbedderPolicy: false
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting to prevent Brute-Force attacks on sensitive routes
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { error: 'Too many failed attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/login', strictLimiter);
app.use('/api/admin/verify', strictLimiter);

// ==========================================
// DATABASE SETUP & PERSISTENCE
// ==========================================
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Connected to secure SQLite database.");
});

// Auto-initialize tables and seed default Soham license record
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

    // Seed Soham official verified license record
    db.get(`SELECT * FROM licenses WHERE license_number = ?`, ['SOHAM-2026-001'], (err, row) => {
        if (!row) {
            db.run(`INSERT INTO licenses (license_number, student_name, status) VALUES (?, ?, ?)`, 
                ['SOHAM-2026-001', 'Soham Basu', 'Active & Verified']);
        }
    });
});

// ==========================================
// SECURE API ENDPOINTS
// ==========================================

// 1. Student Registration (with Bcrypt Hashing & Input Validation)
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, 
            [name, email, hashedPassword, 'user'], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email is already registered.' });
                }
                return res.status(500).json({ error: 'Database error during registration.' });
            }
            res.json({ success: true, message: 'Account created successfully.' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// 2. User Login (Secure Password Verification)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        res.json({ 
            success: true, 
            user: { name: user.name, email: user.email, role: user.role } 
        });
    });
});

// 3. Admission Application Submission
app.post('/api/admissions', (req, res) => {
    const { student_name, guardian_name, age, phone, email, branch, course } = req.body;

    if (!student_name || !guardian_name || !age || !phone || !email || !branch || !course) {
        return res.status(400).json({ error: 'All admission fields are required.' });
    }

    db.run(`INSERT INTO admissions (student_name, guardian_name, age, phone, email, branch, course) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [student_name, guardian_name, age, phone, email, branch, course], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to submit admission application.' });
        }
        res.json({ success: true, admissionId: this.lastID });
    });
});

// 4. Admin Verification Endpoint (Guarded by Passcode: Money@220077)
app.post('/api/admin/verify', (req, res) => {
    const { passcode } = req.body;

    if (passcode === 'Money@220077') {
        const adminToken = crypto.randomBytes(32).toString('hex');
        return res.json({ success: true, token: adminToken });
    }

    res.status(401).json({ error: 'Incorrect admin passcode.' });
});

// 5. Soham License Verification Module
app.post('/api/verify-license', (req, res) => {
    const { licenseNumber } = req.body;

    if (!licenseNumber) {
        return res.status(400).json({ error: 'License number required.' });
    }

    db.get(`SELECT * FROM licenses WHERE license_number = ?`, [licenseNumber], (err, row) => {
        if (row) {
            res.json({ success: true, student: row.student_name, status: row.status });
        } else {
            res.status(404).json({ success: false, error: 'License key not found or invalid.' });
        }
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Peak backend server running securely on port ${PORT}`);
});