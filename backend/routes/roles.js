const express = require('express');
const { Role, Group, Permission, Module, GroupRole, RolePermission } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Roles CRUD with permission checking
router.get('/roles', authenticateToken, checkPermission('Roles', 'read'), async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.get('/role-groups', authenticateToken, checkPermission('Roles', 'read'), async (req, res) => {
  try {
    const roleGroups = await GroupRole.find()
      .populate('role_id', 'name')
      .populate('group_id', 'name')
      .sort({ 'role_id.name': 1, 'group_id.name': 1 });

    const formattedRoleGroups = roleGroups.map(rg => ({
      role_id: rg.role_id._id,
      group_id: rg.group_id._id,
      role_name: rg.role_id.name,
      group_name: rg.group_id.name
    }));

    res.json(formattedRoleGroups);
  } catch (error) {
    console.error('Error fetching role-groups:', error);
    res.status(500).json({ error: 'Failed to fetch role-groups' });
  }
});

router.post('/roles', authenticateToken, checkPermission('Roles', 'create'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const role = new Role({ name, description });
    await role.save();
    
    res.status(201).json(role);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Role name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create role' });
    }
  }
});

router.put('/roles/:id', authenticateToken, checkPermission('Roles', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const role = await Role.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(role);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Role name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update role' });
    }
  }
});

router.delete('/roles/:id', authenticateToken, checkPermission('Roles', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findByIdAndDelete(id);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Also delete related relationships
    await GroupRole.deleteMany({ role_id: id });
    await RolePermission.deleteMany({ role_id: id });
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

router.get('/roles/:roleId/groups', authenticateToken, checkPermission('Roles', 'read'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const roleGroups = await GroupRole.find({ role_id: roleId })
      .populate('group_id', 'id name description')
      .sort({ 'group_id.name': 1 });

    const groups = roleGroups.map(rg => ({
      id: rg.group_id._id,
      name: rg.group_id.name,
      description: rg.group_id.description
    }));

    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role groups' });
  }
});

router.post('/roles/:roleId/permissions', authenticateToken, checkPermission('Roles', 'update'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissionId } = req.body;
    
    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if permission exists
    const permission = await Permission.findById(permissionId);
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    const rolePermission = new RolePermission({ 
      role_id: roleId, 
      permission_id: permissionId 
    });
    await rolePermission.save();
    
    res.status(201).json({ message: 'Permission assigned to role successfully' });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Permission already assigned to this role' });
    } else {
      res.status(500).json({ error: 'Failed to assign permission to role' });
    }
  }
});

router.get('/roles/:roleId/permissions', authenticateToken, checkPermission('Roles', 'read'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const rolePermissions = await RolePermission.find({ role_id: roleId })
      .populate({
        path: 'permission_id',
        populate: {
          path: 'module_id',
          select: 'name'
        }
      })
      .sort({ 'permission_id.module_id.name': 1, 'permission_id.action': 1 });

    const permissions = rolePermissions.map(rp => ({
      id: rp.permission_id._id,
      name: rp.permission_id.name,
      action: rp.permission_id.action,
      description: rp.permission_id.description,
      module_name: rp.permission_id.module_id.name
    }));

    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

router.delete('/roles/:roleId/permissions/:permissionId', authenticateToken, checkPermission('Roles', 'update'), async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;
    
    const result = await RolePermission.deleteOne({
      role_id: roleId,
      permission_id: permissionId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Permission assignment not found' });
    }
    
    res.status(200).json({ message: 'Permission removed from role successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove permission from role' });
  }
});

module.exports = router;