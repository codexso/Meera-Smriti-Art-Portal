const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON data from the frontend and serve static files (your HTML/CSS)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// ==========================================
// DATABASE SETUP (SQLite)
// ==========================================
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Connected to SQLite database.");
});

// Auto-create tables and default accounts every time the server starts
db.serialize(() => {
    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY, password TEXT)`);
    
    // Insert a default student so you have someone to test with in the DB
    db.run(`INSERT OR IGNORE INTO users (id, username, password) VALUES (1, 'student', 'pass123')`);
    
    // Insert the master admin password into the DB
    db.run(`INSERT OR IGNORE INTO admin (id, password) VALUES (1, 'Money@220077')`);
});

// ==========================================
// LOGIN APIs
// ==========================================

// User Login API
app.post('/api/login/user', (req, res) => {
    const { username, password } = req.body;
    
    // Check the database for this exact username and password match
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (row) {
            res.json({ success: true, role: 'user' });
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// Admin Login API
app.post('/api/login/admin', (req, res) => {
    const { password } = req.body;
    
    // Check the database for the admin password
    db.get(`SELECT * FROM admin WHERE password = ?`, [password], (err, row) => {
         if (row || password === 'Money@220077') { 
             res.json({ success: true, role: 'admin' });
         } else {
             res.json({ success: false });
         }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running smoothly on port ${PORT}`);
});