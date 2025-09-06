const express = require('express');
const { Group, UserGroup, GroupRole } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

router.get('/groups', authenticateToken, checkPermission('Groups', 'read'), async (req, res) => {
  try {
    const groups = await Group.find();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

router.post('/groups', authenticateToken, checkPermission('Groups', 'create'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const group = new Group({ name, description });
    const savedGroup = await group.save();
    res.status(201).json(savedGroup);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Group name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create group' });
    }
  }
});

router.put('/groups/:id', authenticateToken, checkPermission('Groups', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const group = await Group.findByIdAndUpdate(id, { name, description }, {
      new: true,
      runValidators: true
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json(group);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Group name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update group' });
    }
  }
});

router.delete('/groups/:id', authenticateToken, checkPermission('Groups', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete related records first
    await UserGroup.deleteMany({ group_id: id });
    await GroupRole.deleteMany({ group_id: id });
    
    const group = await Group.findByIdAndDelete(id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

router.post('/groups/:groupId/users', authenticateToken, checkPermission('Groups', 'update'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    const existingRelation = await UserGroup.findOne({ user_id: userId, group_id: groupId });
    if (existingRelation) {
      return res.status(400).json({ error: 'User already assigned to this group' });
    }
    
    const userGroup = new UserGroup({ user_id: userId, group_id: groupId });
    await userGroup.save();
    
    res.status(201).json({ message: 'User assigned to group successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign user to group' });
  }
});

router.post('/groups/:groupId/roles', authenticateToken, checkPermission('Groups', 'update'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { roleId } = req.body;
    
    const existingRelation = await GroupRole.findOne({ group_id: groupId, role_id: roleId });
    if (existingRelation) {
      return res.status(400).json({ error: 'Role already assigned to this group' });
    }
    
    const groupRole = new GroupRole({ group_id: groupId, role_id: roleId });
    await groupRole.save();
    
    res.status(201).json({ message: 'Role assigned to group successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign role to group' });
  }
});

router.delete('/groups/:groupId/roles/:roleId', authenticateToken, checkPermission('Groups', 'update'), async (req, res) => {
  try {
    const { groupId, roleId } = req.params;
    
    const result = await GroupRole.findOneAndDelete({ group_id: groupId, role_id: roleId });
    
    if (!result) {
      return res.status(404).json({ error: 'Role is not assigned to this group' });
    }
    
    res.status(200).json({ message: 'Role removed from group successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove role from group' });
  }
});

router.delete('/groups/:groupId/users/:userId', authenticateToken, checkPermission('Groups', 'update'), async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    
    const result = await UserGroup.findOneAndDelete({ user_id: userId, group_id: groupId });
    
    if (!result) {
      return res.status(404).json({ error: 'User is not assigned to this group' });
    }
    
    res.status(200).json({ message: 'User removed from group successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove user from group' });
  }
});

module.exports = router;