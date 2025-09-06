const jwt = require('jsonwebtoken');
const { Module, Permission, UserGroup, GroupRole, RolePermission } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// JWT Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Permission checking middleware
const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Get user groups
      const userGroups = await UserGroup.find({ user_id: userId });
      const groupIds = userGroups.map(ug => ug.group_id);
      
      if (groupIds.length === 0) {
        return res.status(403).json({ 
          error: `Permission denied: ${action} on ${module}` 
        });
      }
      
      // Get group roles
      const groupRoles = await GroupRole.find({ group_id: { $in: groupIds } });
      const roleIds = groupRoles.map(gr => gr.role_id);
      
      if (roleIds.length === 0) {
        return res.status(403).json({ 
          error: `Permission denied: ${action} on ${module}` 
        });
      }
      
      // Find the module
      const moduleDoc = await Module.findOne({ name: module });
      if (!moduleDoc) {
        return res.status(403).json({ 
          error: `Permission denied: ${action} on ${module}` 
        });
      }
      
      // Find the permission
      const permission = await Permission.findOne({ 
        module_id: moduleDoc._id, 
        action: action 
      });
      
      if (!permission) {
        return res.status(403).json({ 
          error: `Permission denied: ${action} on ${module}` 
        });
      }
      
      // Check if any role has this permission
      const rolePermission = await RolePermission.findOne({
        role_id: { $in: roleIds },
        permission_id: permission._id
      });
      
      if (rolePermission) {
        next();
      } else {
        return res.status(403).json({ 
          error: `Permission denied: ${action} on ${module}` 
        });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        error: 'Permission check failed' 
      });
    }
  };
};

module.exports = {
  authenticateToken,
  checkPermission,
  JWT_SECRET
};