const express = require('express');
const { db } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

router.get('/modules', authenticateToken, checkPermission('Modules', 'read'), (req, res) => {
  try {
    const modules = db.prepare('SELECT * FROM modules').all();
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

router.post('/modules', authenticateToken, checkPermission('Modules', 'create'), (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Module name is required' });
    }
    
    const insert = db.prepare('INSERT INTO modules (name, description) VALUES (?, ?)');
    const result = insert.run(name.trim(), description || null);
    
    const module = { 
      id: result.lastInsertRowid, 
      name: name.trim(), 
      description: description || null,
      created_at: new Date().toISOString()
    };
    res.status(201).json(module);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Module name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create module' });
    }
  }
});

router.put('/modules/:id', authenticateToken, checkPermission('Modules', 'update'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Module name is required' });
    }
    
    const existingModule = db.prepare('SELECT id FROM modules WHERE id = ?').get(id);
    if (!existingModule) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    db.prepare('UPDATE modules SET name = ?, description = ? WHERE id = ?')
      .run(name.trim(), description || null, id);
    
    const module = db.prepare('SELECT * FROM modules WHERE id = ?').get(id);
    res.json(module);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Module name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update module' });
    }
  }
});

router.delete('/modules/:id', authenticateToken, checkPermission('Modules', 'delete'), (req, res) => {
  try {
    const { id } = req.params;
    
    const existingModule = db.prepare('SELECT id FROM modules WHERE id = ?').get(id);
    if (!existingModule) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    const permissionCount = db.prepare('SELECT COUNT(*) as count FROM permissions WHERE module_id = ?').get(id);
    if (permissionCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete module with associated permissions. Delete permissions first.' 
      });
    }
    
    db.prepare('DELETE FROM modules WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

router.get('/modules/:id/permissions', authenticateToken, checkPermission('Modules', 'read'), (req, res) => {
  try {
    const { id } = req.params;
    
    const module = db.prepare('SELECT * FROM modules WHERE id = ?').get(id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    const permissions = db.prepare(`
      SELECT p.id, p.name, p.action, p.description, p.created_at
      FROM permissions p
      WHERE p.module_id = ?
      ORDER BY p.action
    `).all(id);
    
    res.json({
      module: module,
      permissions: permissions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch module permissions' });
  }
});

router.get('/modules/:id/stats', authenticateToken, checkPermission('Modules', 'read'), (req, res) => {
  try {
    const { id } = req.params;
    
    const module = db.prepare('SELECT * FROM modules WHERE id = ?').get(id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    const permissionCount = db.prepare('SELECT COUNT(*) as count FROM permissions WHERE module_id = ?').get(id);
    
    const roleCount = db.prepare(`
      SELECT COUNT(DISTINCT r.id) as count
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.module_id = ?
    `).get(id);
    
    const userCount = db.prepare(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      JOIN user_groups ug ON u.id = ug.user_id
      JOIN group_roles gr ON ug.group_id = gr.group_id
      JOIN role_permissions rp ON gr.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.module_id = ?
    `).get(id);
    
    res.json({
      module: module,
      stats: {
        permissions: permissionCount.count,
        roles: roleCount.count,
        users: userCount.count
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch module statistics' });
  }
});

module.exports = router;