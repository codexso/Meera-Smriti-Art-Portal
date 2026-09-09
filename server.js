import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db, { initDatabase } from './database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'meera_smriti_fine_arts_key_1989';

// Initialize SQLite DB schema
initDatabase();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure Uploads Directory Exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'artwork-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP) are allowed.'));
    }
  }
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized access. Token required.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// --- AUTHENTICATION ROUTES ---

app.post('/api/register', (req, res) => {
  try {
    const { name, email, password, year_of_study } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email address is already registered.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, email, password, year_of_study) VALUES (?, ?, ?, ?)'
    ).run(name, email.toLowerCase(), hashedPassword, year_of_study || 1);

    const token = jwt.sign(
      { id: result.lastInsertRowid, email: email.toLowerCase(), name, role: 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: result.lastInsertRowid, name, email: email.toLowerCase(), role: 'student' }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during registration.', error: err.message });
  }
});

app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Invalid email address or password.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email address or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, year: user.year_of_study }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login.', error: err.message });
  }
});

// --- ADMISSIONS ROUTE ---

app.post('/api/admissions', (req, res) => {
  try {
    const { student_name, guardian_name, email, phone, course, year_applying } = req.body;
    if (!student_name || !guardian_name || !email || !phone || !course) {
      return res.status(400).json({ message: 'All admission fields are required.' });
    }

    const result = db.prepare(`
      INSERT INTO admissions (student_name, guardian_name, email, phone, course, year_applying)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(student_name, guardian_name, email, phone, course, year_applying || 1);

    res.status(201).json({ message: 'Admission application submitted successfully!', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit admission form.', error: err.message });
  }
});

app.get('/api/admissions', authenticateToken, (req, res) => {
  try {
    const applications = db.prepare('SELECT * FROM admissions ORDER BY id DESC').all();
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch admissions.' });
  }
});

// --- NOTICES & ADMIN BOARD ---

app.get('/api/notices', (req, res) => {
  try {
    const notices = db.prepare('SELECT * FROM notices ORDER BY id DESC').all();
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notice board.' });
  }
});

app.post('/api/notices', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrative staff can publish notices.' });
    }
    const { title, category, content } = req.body;
    db.prepare('INSERT INTO notices (title, category, content) VALUES (?, ?, ?)').run(title, category, content);
    res.status(201).json({ message: 'Notice published successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to publish notice.' });
  }
});

// --- MONTHLY FEE & EXAMINATION NOTICES ---

app.get('/api/fee-notices', authenticateToken, (req, res) => {
  try {
    let records;
    if (req.user.role === 'admin') {
      records = db.prepare('SELECT * FROM fee_notices ORDER BY id DESC').all();
    } else {
      records = db.prepare('SELECT * FROM fee_notices WHERE student_email = ? ORDER BY id DESC').all(req.user.email);
    }
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch fee/exam notices.' });
  }
});

app.post('/api/fee-notices', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin rights required.' });
    }
    const { student_email, month_year, amount_due, exam_due_date, notice_remarks } = req.body;
    db.prepare(`
      INSERT INTO fee_notices (student_email, month_year, amount_due, exam_due_date, notice_remarks)
      VALUES (?, ?, ?, ?, ?)
    `).run(student_email, month_year, amount_due, exam_due_date, notice_remarks);
    res.status(201).json({ message: 'Fee clearance & exam notice generated.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate fee notice.' });
  }
});

// --- GALLERY & EXHIBITION UPLOADS ---

app.get('/api/gallery', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM gallery ORDER BY id DESC').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch gallery items.' });
  }
});

app.post('/api/gallery', authenticateToken, upload.single('artwork'), (req, res) => {
  try {
    const { title, medium, category } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file of your artwork.' });
    }

    const image_path = `/uploads/${req.file.filename}`;
    db.prepare(`
      INSERT INTO gallery (title, artist_name, medium, image_path, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(title || 'Untitled Work', req.user.name, medium || 'Mixed Media', image_path, category || 'Annual Exhibition');

    res.status(201).json({ message: 'Artwork submitted successfully for exhibition!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload artwork.', error: err.message });
  }
});

// --- BHARAT SANSKRITI UTSAV EVENTS ---

app.get('/api/bsu-events', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM bsu_events ORDER BY id DESC').all();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch Bharat Sanskriti Utsav details.' });
  }
});

// --- ACADEMY LICENSE & ACCREDITATION DATA ---

app.get('/api/academy/license', (req, res) => {
  res.json({
    academy_name: 'Meera Smriti Sishu Ankan Siksha Kendra',
    established: 1989,
    registration_no: 'REG/TR/1989/4821',
    affiliations: [
      'Bangiya Sangeet Parishad (Kolkata)',
      'Bharat Sanskriti Utsav Recognized Art Examination Center',
      'Tripura State Fine Arts Board Recognized Institute'
    ],
    accreditation_status: 'Government Registered 5-Year Fine Arts Diploma Center',
    headquarters: 'Central Fine Arts Building, College Tilla, Agartala, Tripura - 799004',
    contact_phone: '+91 94361 00000',
    contact_email: 'admissions@meerasmriti.org'
  });
});

// Serve Frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Launch High-Performance Backend
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Meera Smriti Fine Arts Engine running at http://localhost:${PORT}`);
});