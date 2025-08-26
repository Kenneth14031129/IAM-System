const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDatabase, db } = require('../backend/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Rate limiting for auth endpoints
const authAttempts = new Map();

const rateLimitAuth = (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 10;

    if (!authAttempts.has(ip)) {
      authAttempts.set(ip, { count: 1, resetTime: now + windowMs });
      return true;
    }

    const attempts = authAttempts.get(ip);
    
    if (now > attempts.resetTime) {
      authAttempts.set(ip, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (attempts.count >= maxAttempts) {
      res.status(429).json({ 
        error: 'Too many registration attempts. Please try again later.' 
      });
      return false;
    }

    attempts.count++;
    return true;
  } catch (error) {
    console.warn('Rate limiting error:', error.message);
    return true; // Allow request if rate limiting fails
  }
};

const validateRegistration = (req, res) => {
  const { username, email, password } = req.body;
  const errors = [];

  // Username validation
  if (!username || username.trim().length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  // Email validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please provide a valid email address');
  }

  // Password validation
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  if (password && !/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one letter and one number');
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join('. ') });
    return false;
  }

  return true;
};

// Initialize database once
let dbInitialized = false;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Initialize database if not already done
  if (!dbInitialized) {
    try {
      console.log('Initializing database for serverless function...');
      initDatabase();
      dbInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database:', error.message);
      return res.status(500).json({ error: 'Database initialization failed' });
    }
  }

  // Rate limiting
  if (!rateLimitAuth(req, res)) {
    return; // Response already sent
  }

  // Validation
  if (!validateRegistration(req, res)) {
    return; // Response already sent
  }

  try {
    const { username, email, password } = req.body;

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const insert = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const result = insert.run(username.trim(), email.trim().toLowerCase(), hashedPassword);

    const user = { id: result.lastInsertRowid, username: username.trim(), email: email.trim().toLowerCase() };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed', details: error.message });
    }
  }
}