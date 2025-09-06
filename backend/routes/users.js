const express = require('express');
const bcrypt = require('bcryptjs');
const { User, Group, UserGroup } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

router.get('/users', authenticateToken, checkPermission('Users', 'read'), async (req, res) => {
  try {
    const users = await User.find().select('username email created_at');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', authenticateToken, checkPermission('Users', 'create'), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    const savedUser = await user.save();
    const { password: _, ...userResponse } = savedUser.toObject();
    res.status(201).json(userResponse);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

router.put('/users/:id', authenticateToken, checkPermission('Users', 'update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password } = req.body;
    
    const updateData = { username, email };
    
    if (password) {
      updateData.password = bcrypt.hashSync(password, 10);
    }
    
    const user = await User.findByIdAndUpdate(id, updateData, { 
      new: true, 
      runValidators: true 
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
});

router.delete('/users/:id', authenticateToken, checkPermission('Users', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/user-groups', authenticateToken, checkPermission('Users', 'read'), async (req, res) => {
  try {
    const userGroups = await UserGroup.find()
      .populate('user_id', 'username')
      .populate('group_id', 'name')
      .sort({ 'user_id.username': 1, 'group_id.name': 1 });
    
    const formattedUserGroups = userGroups.map(ug => ({
      user_id: ug.user_id._id,
      group_id: ug.group_id._id,
      group_name: ug.group_id.name,
      username: ug.user_id.username
    }));
    
    res.json(formattedUserGroups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user-group relationships' });
  }
});

module.exports = router;