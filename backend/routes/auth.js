const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { rateLimitAuth } = require('../middleware/security');
const { validateRegistration, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Register route
router.post('/register', rateLimitAuth, validateRegistration, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const insert = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const result = insert.run(username.trim(), email.trim().toLowerCase(), hashedPassword);

    const user = { id: result.lastInsertRowid, username: username.trim(), email: email.trim().toLowerCase() };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ token, user });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// Login route
router.post('/login', rateLimitAuth, validateLogin, async (req, res) => {
  try {
    console.log('Login attempt received:', { username: req.body.username });
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

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
});

// Get user permissions
router.get('/me/permissions', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT DISTINCT p.id, p.name, p.action, p.description, m.name as module_name
      FROM permissions p
      JOIN modules m ON p.module_id = m.id
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN roles r ON rp.role_id = r.id
      JOIN group_roles gr ON r.id = gr.role_id
      JOIN groups g ON gr.group_id = g.id
      JOIN user_groups ug ON g.id = ug.group_id
      WHERE ug.user_id = ?
    `;
    
    const permissions = db.prepare(query).all(userId);
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Simulate action
router.post('/simulate-action', authenticateToken, (req, res) => {
  try {
    const { module, action } = req.body;
    const userId = req.user.id;
    
    const query = `
      SELECT COUNT(*) as count
      FROM permissions p
      JOIN modules m ON p.module_id = m.id
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN roles r ON rp.role_id = r.id
      JOIN group_roles gr ON r.id = gr.role_id
      JOIN groups g ON gr.group_id = g.id
      JOIN user_groups ug ON g.id = ug.group_id
      WHERE ug.user_id = ? AND m.name = ? AND p.action = ?
    `;
    
    const result = db.prepare(query).get(userId, module, action);
    
    if (result.count > 0) {
      res.json({ 
        allowed: true, 
        message: `Permission granted for ${action} on ${module}` 
      });
    } else {
      res.status(403).json({ 
        allowed: false, 
        message: `Permission denied for ${action} on ${module}` 
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Simulation failed' });
  }
});

module.exports = router;