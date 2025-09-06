const express = require('express');
const { Module, Permission, Role, User, RolePermission, UserGroup, GroupRole } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

router.get('/modules', authenticateToken, checkPermission('Modules', 'read'), async (req, res) => {
  try {
    const modules = await Module.find();
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

router.post('/modules', authenticateToken, checkPermission('Modules', 'create'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Module name is required' });
    }
    
    const module = new Module({ 
      name: name.trim(), 
      description: description || null
    });
    await module.save();
    
    res.status(201).json(module);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Module name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create module' });
    }
  }
});

router.put('/modules/:id', authenticateToken, checkPermission('Modules', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Module name is required' });
    }
    
    const module = await Module.findByIdAndUpdate(
      id,
      { name: name.trim(), description: description || null },
      { new: true, runValidators: true }
    );
    
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    res.json(module);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Module name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update module' });
    }
  }
});

router.delete('/modules/:id', authenticateToken, checkPermission('Modules', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingModule = await Module.findById(id);
    if (!existingModule) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    const permissionCount = await Permission.countDocuments({ module_id: id });
    if (permissionCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete module with associated permissions. Delete permissions first.' 
      });
    }
    
    await Module.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

router.get('/modules/:id/permissions', authenticateToken, checkPermission('Modules', 'read'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const module = await Module.findById(id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    const permissions = await Permission.find({ module_id: id })
      .sort({ action: 1 });
    
    res.json({
      module: module,
      permissions: permissions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch module permissions' });
  }
});

router.get('/modules/:id/stats', authenticateToken, checkPermission('Modules', 'read'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const module = await Module.findById(id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    const permissionCount = await Permission.countDocuments({ module_id: id });
    
    // Count distinct roles that have permissions from this module
    const rolePermissions = await RolePermission.find()
      .populate({
        path: 'permission_id',
        match: { module_id: id }
      });
    
    const uniqueRoleIds = new Set();
    rolePermissions.forEach(rp => {
      if (rp.permission_id) {
        uniqueRoleIds.add(rp.role_id.toString());
      }
    });
    const roleCount = uniqueRoleIds.size;
    
    // Count distinct users that have access to this module through group-role-permission chain
    const userGroupRolePermissions = await UserGroup.aggregate([
      {
        $lookup: {
          from: 'grouproles',
          localField: 'group_id',
          foreignField: 'group_id',
          as: 'groupRoles'
        }
      },
      { $unwind: '$groupRoles' },
      {
        $lookup: {
          from: 'rolepermissions',
          localField: 'groupRoles.role_id',
          foreignField: 'role_id',
          as: 'rolePermissions'
        }
      },
      { $unwind: '$rolePermissions' },
      {
        $lookup: {
          from: 'permissions',
          localField: 'rolePermissions.permission_id',
          foreignField: '_id',
          as: 'permission'
        }
      },
      { $unwind: '$permission' },
      { $match: { 'permission.module_id': module._id } },
      { $group: { _id: '$user_id' } }
    ]);
    
    const userCount = userGroupRolePermissions.length;
    
    res.json({
      module: module,
      stats: {
        permissions: permissionCount,
        roles: roleCount,
        users: userCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch module statistics' });
  }
});

module.exports = router;