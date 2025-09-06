const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Permission, Module, Role, Group, UserGroup, GroupRole, RolePermission } = require('../config/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { rateLimitAuth } = require('../middleware/security');
const { validateRegistration, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Register route
router.post('/register', rateLimitAuth, validateRegistration, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const user = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword
    });
    
    const savedUser = await user.save();
    const userResponse = { id: savedUser._id, username: savedUser.username, email: savedUser.email };
    const token = jwt.sign(userResponse, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ token, user: userResponse });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// Login route
router.post('/login', rateLimitAuth, validateLogin, async (req, res) => {
  try {
    console.log('Login attempt received:', { username: req.body.username });
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    console.log('Looking up user in database...');
    const user = await User.findOne({ username: username.trim() });
    console.log('User found:', !!user);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      console.log('Invalid credentials');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userPayload = { id: user._id, username: user.username, email: user.email };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

    console.log('Login successful');
    res.json({ token, user: userPayload });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get user permissions
router.get('/me/permissions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userGroups = await UserGroup.find({ user_id: userId }).populate('group_id');
    const groupIds = userGroups.map(ug => ug.group_id._id);
    
    const groupRoles = await GroupRole.find({ group_id: { $in: groupIds } }).populate('role_id');
    const roleIds = groupRoles.map(gr => gr.role_id._id);
    
    const rolePermissions = await RolePermission.find({ role_id: { $in: roleIds } })
      .populate({
        path: 'permission_id',
        populate: {
          path: 'module_id',
          model: 'Module'
        }
      });
    
    const permissions = rolePermissions.map(rp => ({
      id: rp.permission_id._id,
      name: rp.permission_id.name,
      action: rp.permission_id.action,
      description: rp.permission_id.description,
      module_name: rp.permission_id.module_id.name
    }));
    
    // Remove duplicates
    const uniquePermissions = permissions.filter((permission, index, self) => 
      index === self.findIndex(p => p.id.toString() === permission.id.toString())
    );
    
    res.json(uniquePermissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Simulate action
router.post('/simulate-action', authenticateToken, async (req, res) => {
  try {
    const { module, action } = req.body;
    const userId = req.user.id;
    
    const userGroups = await UserGroup.find({ user_id: userId });
    const groupIds = userGroups.map(ug => ug.group_id);
    
    const groupRoles = await GroupRole.find({ group_id: { $in: groupIds } });
    const roleIds = groupRoles.map(gr => gr.role_id);
    
    const moduleDoc = await Module.findOne({ name: module });
    if (!moduleDoc) {
      return res.status(400).json({ error: 'Module not found' });
    }
    
    const permission = await Permission.findOne({ 
      module_id: moduleDoc._id, 
      action: action 
    });
    
    if (!permission) {
      return res.status(400).json({ error: 'Permission not found' });
    }
    
    const rolePermission = await RolePermission.findOne({
      role_id: { $in: roleIds },
      permission_id: permission._id
    });
    
    if (rolePermission) {
      res.json({ 
        allowed: true, 
        message: `Permission granted for ${action} on ${module}` 
      });
    } else {
      res.status(403).json({ 
        allowed: false, 
        message: `Permission denied for ${action} on ${module}` 
      });
    }
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

module.exports = router;