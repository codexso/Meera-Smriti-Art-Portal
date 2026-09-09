//token generator for DB
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'academy.sqlite'));

// Enable WAL mode for high concurrency performance
db.pragma('journal_mode = WAL');

export function initDatabase() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      year_of_study INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Admissions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name TEXT NOT NULL,
      guardian_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      course TEXT NOT NULL,
      year_applying INTEGER NOT NULL,
      status TEXT DEFAULT 'Pending Review',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Notices & Board Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      is_admin_only INTEGER DEFAULT 0,
      posted_date TEXT DEFAULT (DATE('now'))
    )
  `);

  // 4. Monthly Fee & Examination Notices
  db.exec(`
    CREATE TABLE IF NOT EXISTS fee_notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_email TEXT NOT NULL,
      month_year TEXT NOT NULL,
      amount_due REAL NOT NULL,
      exam_due_date TEXT NOT NULL,
      payment_status TEXT DEFAULT 'Unpaid (Collect at Office)',
      notice_remarks TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Exhibition & Gallery Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      medium TEXT NOT NULL,
      image_path TEXT NOT NULL,
      category TEXT DEFAULT 'Exhibition',
      status TEXT DEFAULT 'Approved',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. Bharat Sanskriti Utsav Events Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bsu_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_title TEXT NOT NULL,
      category TEXT NOT NULL,
      venue TEXT NOT NULL,
      event_date TEXT NOT NULL,
      guidelines TEXT NOT NULL,
      status TEXT DEFAULT 'Open for Entry'
    )
  `);

  // Seed Default Admin Account
  const adminExists = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@meerasmriti.org');
  if (!adminExists) {
    const hashedPass = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
      'Principal Desk (Admin)',
      'admin@meerasmriti.org',
      hashedPass,
      'admin'
    );
  }

  // Seed Default Notices if Empty
  const noticeCount = db.prepare('SELECT COUNT(*) as count FROM notices').get();
  if (noticeCount.count === 0) {
    db.prepare('INSERT INTO notices (title, category, content) VALUES (?, ?, ?)').run(
      'Annual Diploma Examination Schedule 2026',
      'Examination Notice',
      'The 5-Year Diploma practical and theoretical examinations will commence from November 15, 2026. Admit cards must be verified at the academy counter.'
    );
    db.prepare('INSERT INTO notices (title, category, content) VALUES (?, ?, ?)').run(
      'Monthly Fee Notice - October 2026',
      'Fee Notice',
      'Students are requested to clear monthly tuition and examination registration fees at the administrative office before October 10th. Note: Online payment is not accepted; clearance slips are issued at counter.'
    );
  }

  // Seed Default Bharat Sanskriti Utsav Events
  const bsuCount = db.prepare('SELECT COUNT(*) as count FROM bsu_events').get();
  if (bsuCount.count === 0) {
    db.prepare('INSERT INTO bsu_events (event_title, category, venue, event_date, guidelines) VALUES (?, ?, ?, ?, ?)').run(
      '36th All India Fine Arts Talent Competition',
      'Bharat Sanskriti Utsav 2026',
      'Rabindra Shatabarshiki Bhavan, Agartala',
      'December 20, 2026',
      'Open to 1st to 5th Year Diploma candidates. Themes: Traditional Indian Heritage, Oil & Acrylic Open Session.'
    );
  }

  console.log('⚡ SQLite Database initialized successfully with high-performance WAL mode.');
}

export default db;