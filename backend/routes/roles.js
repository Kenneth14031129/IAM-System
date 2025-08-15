const express = require('express');
const { db } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Roles CRUD with permission checking
router.get('/roles', authenticateToken, checkPermission('Roles', 'read'), (req, res) => {
  try {
    const roles = db.prepare('SELECT * FROM roles').all();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.get('/role-groups', authenticateToken, checkPermission('Roles', 'read'), (req, res) => {
  try {
    const roleGroups = db.prepare(`
      SELECT 
        gr.role_id, 
        gr.group_id, 
        r.name as role_name, 
        g.name as group_name
      FROM group_roles gr
      JOIN roles r ON gr.role_id = r.id
      JOIN groups g ON gr.group_id = g.id
      ORDER BY r.name, g.name
    `).all();
    res.json(roleGroups);
  } catch (error) {
    console.error('Error fetching role-groups:', error);
    res.status(500).json({ error: 'Failed to fetch role-groups' });
  }
});

router.post('/roles', authenticateToken, checkPermission('Roles', 'create'), (req, res) => {
  try {
    const { name, description } = req.body;
    const insert = db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)');
    const result = insert.run(name, description || null);
    
    const role = { id: result.lastInsertRowid, name, description };
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create role' });
  }
});

router.put('/roles/:id', authenticateToken, checkPermission('Roles', 'update'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    db.prepare('UPDATE roles SET name = ?, description = ? WHERE id = ?').run(name, description, id);
    
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.delete('/roles/:id', authenticateToken, checkPermission('Roles', 'delete'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM roles WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

router.get('/roles/:roleId/groups', authenticateToken, checkPermission('Roles', 'read'), (req, res) => {
  try {
    const { roleId } = req.params;
    const roleGroups = db.prepare(`
      SELECT g.id, g.name, g.description
      FROM groups g
      JOIN group_roles gr ON g.id = gr.group_id
      WHERE gr.role_id = ?
      ORDER BY g.name
    `).all(roleId);
    res.json(roleGroups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role groups' });
  }
});

router.post('/roles/:roleId/permissions', authenticateToken, checkPermission('Roles', 'update'), (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissionId } = req.body;
    
    const insert = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    insert.run(roleId, permissionId);
    
    res.status(201).json({ message: 'Permission assigned to role successfully' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Permission already assigned to this role' });
    } else {
      res.status(500).json({ error: 'Failed to assign permission to role' });
    }
  }
});

router.get('/roles/:roleId/permissions', authenticateToken, checkPermission('Roles', 'read'), (req, res) => {
  try {
    const { roleId } = req.params;
    const rolePermissions = db.prepare(`
      SELECT p.id, p.name, p.action, p.description, m.name as module_name
      FROM permissions p
      JOIN modules m ON p.module_id = m.id
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY m.name, p.action
    `).all(roleId);
    res.json(rolePermissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

router.delete('/roles/:roleId/permissions/:permissionId', authenticateToken, checkPermission('Roles', 'update'), (req, res) => {
  try {
    const { roleId, permissionId } = req.params;
    
    db.prepare('DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?').run(roleId, permissionId);
    
    res.status(200).json({ message: 'Permission removed from role successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove permission from role' });
  }
});

module.exports = router;