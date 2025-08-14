const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

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
      
      const query = `
        SELECT COUNT(*) as count
        FROM permissions p
        JOIN modules m ON p.module_id = m.id
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        JOIN group_roles gr ON r.id = gr.role_id
        JOIN groups g ON gr.group_id = g.id
        JOIN user_groups ug ON g.id = ug.group_id
        WHERE ug.user_id = ? AND m.name = ? AND p.action = ?
      `;
      
      const result = db.prepare(query).get(userId, module, action);
      
      if (result.count > 0) {
        next(); // Permission granted, continue to route handler
      } else {
        return res.status(403).json({ 
          error: `Permission denied: ${action} on ${module}` 
        });
      }
    } catch (error) {
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