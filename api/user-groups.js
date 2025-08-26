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
        const userGroups = db.prepare(`
          SELECT ug.*, u.username, u.email, g.name as group_name, g.description as group_description
          FROM user_groups ug
          LEFT JOIN users u ON ug.user_id = u.id
          LEFT JOIN groups g ON ug.group_id = g.id
          ORDER BY ug.created_at DESC
        `).all();
        res.json(userGroups);
        break;

      case 'POST':
        const { user_id, group_id } = req.body;
        if (!user_id || !group_id) {
          return res.status(400).json({ error: 'user_id and group_id are required' });
        }
        
        const result = db.prepare('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)').run(user_id, group_id);
        res.json({ 
          id: result.lastInsertRowid, 
          user_id, 
          group_id,
          message: 'User assigned to group successfully' 
        });
        break;

      case 'DELETE':
        const deleteId = req.query.id || req.body.id;
        const deleteUserId = req.query.user_id || req.body.user_id;
        const deleteGroupId = req.query.group_id || req.body.group_id;
        
        if (deleteId) {
          db.prepare('DELETE FROM user_groups WHERE id = ?').run(deleteId);
        } else if (deleteUserId && deleteGroupId) {
          db.prepare('DELETE FROM user_groups WHERE user_id = ? AND group_id = ?').run(deleteUserId, deleteGroupId);
        } else {
          return res.status(400).json({ error: 'Either id or both user_id and group_id are required' });
        }
        
        res.json({ message: 'User removed from group successfully' });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User-groups API error:', error);
    res.status(error.message === 'Authorization token required' || error.name === 'JsonWebTokenError' ? 401 : 500)
       .json({ error: error.message || 'Internal server error' });
  }
};