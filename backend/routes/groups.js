const express = require('express');
const { db } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Groups CRUD with permission checking
router.get('/groups', authenticateToken, checkPermission('Groups', 'read'), (req, res) => {
  try {
    const groups = db.prepare('SELECT * FROM groups').all();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

router.post('/groups', authenticateToken, checkPermission('Groups', 'create'), (req, res) => {
  try {
    const { name, description } = req.body;
    const insert = db.prepare('INSERT INTO groups (name, description) VALUES (?, ?)');
    const result = insert.run(name, description || null);
    
    const group = { id: result.lastInsertRowid, name, description };
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

router.put('/groups/:id', authenticateToken, checkPermission('Groups', 'update'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    db.prepare('UPDATE groups SET name = ?, description = ? WHERE id = ?').run(name, description, id);
    
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update group' });
  }
});

router.delete('/groups/:id', authenticateToken, checkPermission('Groups', 'delete'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM groups WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Assign user to group (requires Groups update permission)
router.post('/groups/:groupId/users', authenticateToken, checkPermission('Groups', 'update'), (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    const insert = db.prepare('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)');
    insert.run(userId, groupId);
    
    res.status(201).json({ message: 'User assigned to group successfully' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'User already assigned to this group' });
    } else {
      res.status(500).json({ error: 'Failed to assign user to group' });
    }
  }
});

router.post('/groups/:groupId/roles', authenticateToken, checkPermission('Groups', 'update'), (req, res) => {
  try {
    const { groupId } = req.params;
    const { roleId } = req.body;
    
    const insert = db.prepare('INSERT INTO group_roles (group_id, role_id) VALUES (?, ?)');
    insert.run(groupId, roleId);
    
    res.status(201).json({ message: 'Role assigned to group successfully' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Role already assigned to this group' });
    } else {
      res.status(500).json({ error: 'Failed to assign role to group' });
    }
  }
});

// Remove role from group
router.delete('/groups/:groupId/roles/:roleId', authenticateToken, checkPermission('Groups', 'update'), (req, res) => {
  try {
    const { groupId, roleId } = req.params;
    
    db.prepare('DELETE FROM group_roles WHERE group_id = ? AND role_id = ?').run(groupId, roleId);
    
    res.status(200).json({ message: 'Role removed from group successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove role from group' });
  }
});

module.exports = router;