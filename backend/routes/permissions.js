const express = require('express');
const { Permission, Module, Role, RolePermission } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

router.get('/permissions', authenticateToken, checkPermission('Permissions', 'read'), async (req, res) => {
  try {
    const permissions = await Permission.find()
      .populate('module_id', 'name')
      .sort({ 'module_id.name': 1, action: 1 });
    
    const formattedPermissions = permissions.map(p => ({
      _id: p._id,
      name: p.name,
      action: p.action,
      description: p.description,
      module_id: p.module_id._id,
      module_name: p.module_id.name,
      created_at: p.created_at
    }));
    
    res.json(formattedPermissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

router.post('/permissions', authenticateToken, checkPermission('Permissions', 'create'), async (req, res) => {
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
    
    const module = await Module.findById(module_id);
    if (!module) {
      return res.status(400).json({ error: 'Invalid module ID' });
    }
    
    const permission = new Permission({
      name: name.trim(),
      action: action.toLowerCase(),
      module_id,
      description: description || null
    });
    await permission.save();
    
    const populatedPermission = await Permission.findById(permission._id)
      .populate('module_id', 'name');
    
    const formattedPermission = {
      _id: populatedPermission._id,
      name: populatedPermission.name,
      action: populatedPermission.action,
      description: populatedPermission.description,
      module_id: populatedPermission.module_id._id,
      module_name: populatedPermission.module_id.name,
      created_at: populatedPermission.created_at
    };
    
    res.status(201).json(formattedPermission);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Permission with this action already exists for this module' });
    } else {
      res.status(500).json({ error: 'Failed to create permission' });
    }
  }
});

router.put('/permissions/:id', authenticateToken, checkPermission('Permissions', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, action, module_id, description } = req.body;
    
    const existingPermission = await Permission.findById(id);
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
    
    const module = await Module.findById(module_id);
    if (!module) {
      return res.status(400).json({ error: 'Invalid module ID' });
    }
    
    const permission = await Permission.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        action: action.toLowerCase(),
        module_id,
        description: description || null
      },
      { new: true, runValidators: true }
    ).populate('module_id', 'name');
    
    const formattedPermission = {
      _id: permission._id,
      name: permission.name,
      action: permission.action,
      description: permission.description,
      module_id: permission.module_id._id,
      module_name: permission.module_id.name,
      created_at: permission.created_at
    };
    
    res.json(formattedPermission);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Permission with this action already exists for this module' });
    } else {
      res.status(500).json({ error: 'Failed to update permission' });
    }
  }
});

router.delete('/permissions/:id', authenticateToken, checkPermission('Permissions', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingPermission = await Permission.findById(id);
    if (!existingPermission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    const roleCount = await RolePermission.countDocuments({ permission_id: id });
    if (roleCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete permission that is assigned to roles. Remove from roles first.' 
      });
    }
    
    await Permission.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete permission' });
  }
});

router.get('/permissions/:id/roles', authenticateToken, checkPermission('Permissions', 'read'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const permission = await Permission.findById(id)
      .populate('module_id', 'name');
    
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    const rolePermissions = await RolePermission.find({ permission_id: id })
      .populate('role_id', 'id name description created_at')
      .sort({ 'role_id.name': 1 });
    
    const roles = rolePermissions.map(rp => ({
      id: rp.role_id._id,
      name: rp.role_id.name,
      description: rp.role_id.description,
      created_at: rp.role_id.created_at
    }));
    
    const formattedPermission = {
      _id: permission._id,
      name: permission.name,
      action: permission.action,
      description: permission.description,
      module_id: permission.module_id._id,
      module_name: permission.module_id.name,
      created_at: permission.created_at
    };
    
    res.json({
      permission: formattedPermission,
      roles: roles
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permission roles' });
  }
});

router.get('/permissions-by-module', authenticateToken, checkPermission('Permissions', 'read'), async (req, res) => {
  try {
    const modules = await Module.find().sort({ name: 1 });
    
    const grouped = [];
    
    for (const module of modules) {
      const permissions = await Permission.find({ module_id: module._id })
        .sort({ action: 1 });
      
      grouped.push({
        id: module._id,
        name: module.name,
        description: module.description,
        permissions: permissions.map(p => ({
          id: p._id,
          name: p.name,
          action: p.action,
          description: p.description,
          created_at: p.created_at
        }))
      });
    }
    
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions by module' });
  }
});

router.post('/permissions-bulk-assign', authenticateToken, checkPermission('Permissions', 'update'), async (req, res) => {
  try {
    const { roleId, permissionIds } = req.body;
    
    if (!roleId || !permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'Role ID and permission IDs array are required' });
    }
    
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }
    
    if (permissionIds.length === 0) {
      return res.status(400).json({ error: 'At least one permission ID is required' });
    }
    
    const validPermissions = await Permission.find({ _id: { $in: permissionIds } });
    
    if (validPermissions.length !== permissionIds.length) {
      return res.status(400).json({ error: 'One or more invalid permission IDs' });
    }
    
    let assignedCount = 0;
    
    for (const permissionId of permissionIds) {
      try {
        const rolePermission = new RolePermission({ 
          role_id: roleId, 
          permission_id: permissionId 
        });
        await rolePermission.save();
        assignedCount++;
      } catch (error) {
        // Skip if already exists (duplicate key error)
        if (error.code !== 11000) {
          throw error;
        }
      }
    }
    
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