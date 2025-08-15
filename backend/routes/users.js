const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

router.get('/users', authenticateToken, checkPermission('Users', 'read'), (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, created_at FROM users').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', authenticateToken, checkPermission('Users', 'create'), (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const insert = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const result = insert.run(username, email, hashedPassword);
    
    const user = { id: result.lastInsertRowid, username, email };
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

router.put('/users/:id', authenticateToken, checkPermission('Users', 'update'), (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password } = req.body;
    
    let query = 'UPDATE users SET username = ?, email = ?';
    let params = [username, email];
    
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    db.prepare(query).run(...params);
    
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', authenticateToken, checkPermission('Users', 'delete'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/user-groups', authenticateToken, checkPermission('Users', 'read'), (req, res) => {
  try {
    const userGroups = db.prepare(`
      SELECT ug.user_id, ug.group_id, g.name as group_name, u.username
      FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      JOIN users u ON ug.user_id = u.id
      ORDER BY u.username, g.name
    `).all();
    res.json(userGroups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user-group relationships' });
  }
});

module.exports = router;