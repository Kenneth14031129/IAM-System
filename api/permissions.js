const jwt = require('jsonwebtoken');

// Import database
let initDatabase, db;
try {
  const dbModule = require('../backend/config/database');
  initDatabase = dbModule.initDatabase;
  db = dbModule.db;
} catch (error) {
  console.error('Database module import error:', error);
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
let dbInitialized = false;

const initDb = () => {
  if (!dbInitialized) {
    try {
      if (!initDatabase || !db) {
        throw new Error('Database modules not available');
      }
      initDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('❌ Error initializing database:', error.message);
      throw error;
    }
  }
};

const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization token required');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    initDb();
    verifyToken(req);

    switch (req.method) {
      case 'GET':
        const permissions = db.prepare(`
          SELECT p.*, m.name as module_name 
          FROM permissions p 
          LEFT JOIN modules m ON p.module_id = m.id 
          ORDER BY p.created_at DESC
        `).all();
        res.json(permissions);
        break;

      case 'POST':
        const { name, action, module_id, description } = req.body;
        if (!name || !action || !module_id) {
          return res.status(400).json({ error: 'Name, action, and module_id are required' });
        }
        
        const result = db.prepare('INSERT INTO permissions (name, action, module_id, description) VALUES (?, ?, ?, ?)').run(name, action, module_id, description || '');
        res.json({ 
          id: result.lastInsertRowid, 
          name, 
          action,
          module_id,
          description: description || '',
          message: 'Permission created successfully' 
        });
        break;

      case 'PUT':
        const permissionId = req.body.id;
        const { name: updateName, action: updateAction, module_id: updateModuleId, description: updateDesc } = req.body;
        
        if (!updateName || !updateAction || !updateModuleId) {
          return res.status(400).json({ error: 'Name, action, and module_id are required' });
        }
        
        db.prepare('UPDATE permissions SET name = ?, action = ?, module_id = ?, description = ? WHERE id = ?')
          .run(updateName, updateAction, updateModuleId, updateDesc || '', permissionId);
        res.json({ message: 'Permission updated successfully' });
        break;

      case 'DELETE':
        const deletePermissionId = req.query.id || req.body.id;
        db.prepare('DELETE FROM permissions WHERE id = ?').run(deletePermissionId);
        res.json({ message: 'Permission deleted successfully' });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Permissions API error:', error);
    res.status(error.message === 'Authorization token required' || error.name === 'JsonWebTokenError' ? 401 : 500)
       .json({ error: error.message || 'Internal server error' });
  }
};