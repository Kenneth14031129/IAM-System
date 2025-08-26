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
        const groups = db.prepare('SELECT * FROM groups ORDER BY created_at DESC').all();
        res.json(groups);
        break;

      case 'POST':
        const { name, description } = req.body;
        if (!name) {
          return res.status(400).json({ error: 'Group name is required' });
        }
        
        const result = db.prepare('INSERT INTO groups (name, description) VALUES (?, ?)').run(name, description || '');
        res.json({ 
          id: result.lastInsertRowid, 
          name, 
          description: description || '',
          message: 'Group created successfully' 
        });
        break;

      case 'PUT':
        const groupId = req.body.id;
        const { name: updateName, description: updateDesc } = req.body;
        
        if (!updateName) {
          return res.status(400).json({ error: 'Group name is required' });
        }
        
        db.prepare('UPDATE groups SET name = ?, description = ? WHERE id = ?').run(updateName, updateDesc || '', groupId);
        res.json({ message: 'Group updated successfully' });
        break;

      case 'DELETE':
        const deleteGroupId = req.query.id || req.body.id;
        db.prepare('DELETE FROM groups WHERE id = ?').run(deleteGroupId);
        res.json({ message: 'Group deleted successfully' });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Groups API error:', error);
    res.status(error.message === 'Authorization token required' || error.name === 'JsonWebTokenError' ? 401 : 500)
       .json({ error: error.message || 'Internal server error' });
  }
};