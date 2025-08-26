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
        const roleGroups = db.prepare(`
          SELECT gr.*, g.name as group_name, g.description as group_description, r.name as role_name, r.description as role_description
          FROM group_roles gr
          LEFT JOIN groups g ON gr.group_id = g.id
          LEFT JOIN roles r ON gr.role_id = r.id
          ORDER BY gr.created_at DESC
        `).all();
        res.json(roleGroups);
        break;

      case 'POST':
        const { group_id, role_id } = req.body;
        if (!group_id || !role_id) {
          return res.status(400).json({ error: 'group_id and role_id are required' });
        }
        
        const result = db.prepare('INSERT INTO group_roles (group_id, role_id) VALUES (?, ?)').run(group_id, role_id);
        res.json({ 
          id: result.lastInsertRowid, 
          group_id, 
          role_id,
          message: 'Role assigned to group successfully' 
        });
        break;

      case 'DELETE':
        const deleteId = req.query.id || req.body.id;
        const deleteGroupId = req.query.group_id || req.body.group_id;
        const deleteRoleId = req.query.role_id || req.body.role_id;
        
        if (deleteId) {
          db.prepare('DELETE FROM group_roles WHERE id = ?').run(deleteId);
        } else if (deleteGroupId && deleteRoleId) {
          db.prepare('DELETE FROM group_roles WHERE group_id = ? AND role_id = ?').run(deleteGroupId, deleteRoleId);
        } else {
          return res.status(400).json({ error: 'Either id or both group_id and role_id are required' });
        }
        
        res.json({ message: 'Role removed from group successfully' });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Role-groups API error:', error);
    res.status(error.message === 'Authorization token required' || error.name === 'JsonWebTokenError' ? 401 : 500)
       .json({ error: error.message || 'Internal server error' });
  }
};