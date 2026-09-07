const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('⚡ Initializing Meera Smriti Database Schema...');

db.serialize(() => {
  // Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Admissions Table
  db.run(`
    CREATE TABLE IF NOT EXISTS admissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name TEXT NOT NULL,
      guardian_name TEXT NOT NULL,
      age INTEGER NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      branch TEXT NOT NULL,
      course TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create default Admin account
  db.run(`
    INSERT OR IGNORE INTO users (id, name, email, password, role)
    VALUES (1, 'Chanchal Ghosh (Director)', 'admin@meerasmriti.org', 'admin123', 'admin')
  `);

  console.log('✅ Database created successfully at:', dbPath);
});

db.close();