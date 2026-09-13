import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_soham_key_2026';

const db = new Database('portal.db');
db.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT);
    CREATE TABLE IF NOT EXISTS admissions (id INTEGER PRIMARY KEY, name TEXT, course TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
`);

const adminCheck = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminCheck) {
    db.prepare("INSERT INTO users (username, password) VALUES ('admin', 'meera2026')").run();
}

let totalTraffic = 1420;
app.use((req, res, next) => {
    if (['/', '/index.html'].includes(req.path)) totalTraffic++;
    next();
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access Denied" });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid Token" });
        req.user = user;
        next();
    });
};

// --- PUBLIC ROUTES ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
        const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// ANYONE CAN REGISTER (No authentication required here)
app.post('/api/students', (req, res) => {
    const { name, course } = req.body;
    const stmt = db.prepare("INSERT INTO admissions (name, course) VALUES (?, ?)");
    const info = stmt.run(name, course);
    res.json({ id: info.lastInsertRowid, name, course });
});

// --- SECURE ADMIN ROUTES ---
app.get('/api/students', authenticateToken, (req, res) => {
    res.json(db.prepare("SELECT * FROM admissions ORDER BY id DESC").all());
});

app.delete('/api/students/:id', authenticateToken, (req, res) => {
    db.prepare("DELETE FROM admissions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

app.get('/api/stats', authenticateToken, (req, res) => {
    const studentCount = db.prepare("SELECT COUNT(*) as count FROM admissions").get().count;
    res.json({
        traffic: totalTraffic,
        admissions: studentCount,
        uptime: Math.floor(process.uptime() / 60)
    });
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Server online on port 3000'));