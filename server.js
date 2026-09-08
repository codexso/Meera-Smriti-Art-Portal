import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'meera_smriti_secret_key_1989';
const MONGO_URI = process.env.MONGO_URI;

// Connection status tracker
let isDbConnected = false;

if (!MONGO_URI) {
  console.error('CRITICAL ERROR: MONGO_URI environment variable is missing.');
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      isDbConnected = true;
      console.log('MongoDB Connected Successfully');
    })
    .catch((err) => {
      isDbConnected = false;
      console.error('MongoDB Connection Error:', err.message);
    });
}

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, default: 'student' }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

// Middleware to verify DB status before processing auth requests
const checkDbConnection = (req, res, next) => {
  if (!isDbConnected || mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database connection failed.',
      error: 'Cannot communicate with MongoDB. Check MONGO_URI or Atlas IP Network Access on Render.'
    });
  }
  next();
};

// --- AUTH API ENDPOINTS ---

app.post('/api/register', checkDbConnection, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
      redirectTo: 'main.html'
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({
      message: 'Server error during registration',
      error: err.message
    });
  }
});

app.post('/api/login', checkDbConnection, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email },
      redirectTo: 'main.html'
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({
      message: 'Server error during login',
      error: err.message
    });
  }
});

// Fallback HTML router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});