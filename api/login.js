const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import database - handle potential import issues
let initDatabase, db;
try {
  const dbModule = require('../backend/config/database');
  initDatabase = dbModule.initDatabase;
  db = dbModule.db;
} catch (error) {
  console.error('Database module import error:', error);
}

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
        error: 'Too many login attempts. Please try again later.' 
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

const validateLogin = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return false;
  }

  if (username.trim().length === 0 || password.trim().length === 0) {
    res.status(400).json({ error: 'Username and password cannot be empty' });
    return false;
  }

  return true;
};

// Initialize database once
let dbInitialized = false;

module.exports = async (req, res) => {
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
      if (!initDatabase || !db) {
        throw new Error('Database modules not available');
      }
      initDatabase();
      dbInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database:', error.message);
      return res.status(500).json({ error: 'Database initialization failed', details: error.message });
    }
  }

  // Rate limiting
  if (!rateLimitAuth(req, res)) {
    return; // Response already sent
  }

  // Validation
  if (!validateLogin(req, res)) {
    return; // Response already sent
  }

  try {
    console.log('Login attempt received:', { username: req.body.username });
    const { username, password } = req.body;

    console.log('Looking up user in database...');
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
    console.log('User found:', !!user);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      console.log('Invalid credentials');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userPayload = { id: user.id, username: user.username, email: user.email };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

    console.log('Login successful');
    res.json({ token, user: userPayload });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
}