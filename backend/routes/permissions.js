const express = require('express');
const { db } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

router.get('/permissions', authenticateToken, checkPermission('Permissions', 'read'), (req, res) => {
  try {
    const permissions = db.prepare(`
      SELECT p.*, m.name as module_name 
      FROM permissions p 
      LEFT JOIN modules m ON p.module_id = m.id
      ORDER BY m.name, p.action
    `).all();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

router.post('/permissions', authenticateToken, checkPermission('Permissions', 'create'), (req, res) => {
  try {
    const { name, action, module_id, description } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Permission name is required' });
    }
    if (!action || action.trim().length === 0) {
      return res.status(400).json({ error: 'Action is required' });
    }
    if (!module_id) {
      return res.status(400).json({ error: 'Module is required' });
    }
    
    const validActions = ['create', 'read', 'update', 'delete'];
    if (!validActions.includes(action.toLowerCase())) {
      return res.status(400).json({ 
        error: `Invalid action. Must be one of: ${validActions.join(', ')}` 
      });
    }
    
    const module = db.prepare('SELECT id FROM modules WHERE id = ?').get(module_id);
    if (!module) {
      return res.status(400).json({ error: 'Invalid module ID' });
    }
    
    const insert = db.prepare('INSERT INTO permissions (name, action, module_id, description) VALUES (?, ?, ?, ?)');
    const result = insert.run(name.trim(), action.toLowerCase(), module_id, description || null);
    
    const permission = db.prepare(`
      SELECT p.*, m.name as module_name 
      FROM permissions p 
      LEFT JOIN modules m ON p.module_id = m.id 
      WHERE p.id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(permission);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Permission with this action already exists for this module' });
    } else {
      res.status(500).json({ error: 'Failed to create permission' });
    }
  }
});

router.put('/permissions/:id', authenticateToken, checkPermission('Permissions', 'update'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, action, module_id, description } = req.body;
    
    const existingPermission = db.prepare('SELECT id FROM permissions WHERE id = ?').get(id);
    if (!existingPermission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Permission name is required' });
    }
    if (!action || action.trim().length === 0) {
      return res.status(400).json({ error: 'Action is required' });
    }
    if (!module_id) {
      return res.status(400).json({ error: 'Module is required' });
    }
    
    const validActions = ['create', 'read', 'update', 'delete'];
    if (!validActions.includes(action.toLowerCase())) {
      return res.status(400).json({ 
        error: `Invalid action. Must be one of: ${validActions.join(', ')}` 
      });
    }
    
    const module = db.prepare('SELECT id FROM modules WHERE id = ?').get(module_id);
    if (!module) {
      return res.status(400).json({ error: 'Invalid module ID' });
    }
    
    db.prepare('UPDATE permissions SET name = ?, action = ?, module_id = ?, description = ? WHERE id = ?')
      .run(name.trim(), action.toLowerCase(), module_id, description || null, id);
    
    const permission = db.prepare(`
      SELECT p.*, m.name as module_name 
      FROM permissions p 
      LEFT JOIN modules m ON p.module_id = m.id 
      WHERE p.id = ?
    `).get(id);
    
    res.json(permission);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Permission with this action already exists for this module' });
    } else {
      res.status(500).json({ error: 'Failed to update permission' });
    }
  }
});

router.delete('/permissions/:id', authenticateToken, checkPermission('Permissions', 'delete'), (req, res) => {
  try {
    const { id } = req.params;
    
    const existingPermission = db.prepare('SELECT id FROM permissions WHERE id = ?').get(id);
    if (!existingPermission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    const roleCount = db.prepare('SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = ?').get(id);
    if (roleCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete permission that is assigned to roles. Remove from roles first.' 
      });
    }
    
    db.prepare('DELETE FROM permissions WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete permission' });
  }
});

router.get('/permissions/:id/roles', authenticateToken, checkPermission('Permissions', 'read'), (req, res) => {
  try {
    const { id } = req.params;
    
    const permission = db.prepare(`
      SELECT p.*, m.name as module_name 
      FROM permissions p 
      LEFT JOIN modules m ON p.module_id = m.id 
      WHERE p.id = ?
    `).get(id);
    
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    const roles = db.prepare(`
      SELECT r.id, r.name, r.description, r.created_at
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      WHERE rp.permission_id = ?
      ORDER BY r.name
    `).all(id);
    
    res.json({
      permission: permission,
      roles: roles
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permission roles' });
  }
});

router.get('/permissions-by-module', authenticateToken, checkPermission('Permissions', 'read'), (req, res) => {
  try {
    const permissionsGrouped = db.prepare(`
      SELECT 
        m.id as module_id,
        m.name as module_name,
        m.description as module_description,
        p.id as permission_id,
        p.name as permission_name,
        p.action,
        p.description as permission_description,
        p.created_at
      FROM modules m
      LEFT JOIN permissions p ON m.id = p.module_id
      ORDER BY m.name, p.action
    `).all();
    
    const grouped = {};
    permissionsGrouped.forEach(row => {
      const moduleId = row.module_id;
      if (!grouped[moduleId]) {
        grouped[moduleId] = {
          id: moduleId,
          name: row.module_name,
          description: row.module_description,
          permissions: []
        };
      }
      
      if (row.permission_id) {
        grouped[moduleId].permissions.push({
          id: row.permission_id,
          name: row.permission_name,
          action: row.action,
          description: row.permission_description,
          created_at: row.created_at
        });
      }
    });
    
    res.json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions by module' });
  }
});

router.post('/permissions-bulk-assign', authenticateToken, checkPermission('Permissions', 'update'), (req, res) => {
  try {
    const { roleId, permissionIds } = req.body;
    
    if (!roleId || !permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'Role ID and permission IDs array are required' });
    }
    
    const role = db.prepare('SELECT id FROM roles WHERE id = ?').get(roleId);
    if (!role) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }
    
    if (permissionIds.length === 0) {
      return res.status(400).json({ error: 'At least one permission ID is required' });
    }
    
    const placeholders = permissionIds.map(() => '?').join(',');
    const validPermissions = db.prepare(`
      SELECT id FROM permissions WHERE id IN (${placeholders})
    `).all(...permissionIds);
    
    if (validPermissions.length !== permissionIds.length) {
      return res.status(400).json({ error: 'One or more invalid permission IDs' });
    }
    
    const insert = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    let assignedCount = 0;
    
    permissionIds.forEach(permissionId => {
      const result = insert.run(roleId, permissionId);
      if (result.changes > 0) {
        assignedCount++;
      }
    });
    
    res.status(201).json({ 
      message: `${assignedCount} permissions assigned to role successfully`,
      assigned: assignedCount,
      total: permissionIds.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign permissions to role' });
  }
});

module.exports = router;