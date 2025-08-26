const bcrypt = require('bcryptjs');
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
        const users = db.prepare('SELECT id, username, email, created_at FROM users').all();
        res.json(users);
        break;

      case 'POST':
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
          return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, hashedPassword);
        
        res.json({ 
          id: result.lastInsertRowid, 
          username, 
          email, 
          message: 'User created successfully' 
        });
        break;

      case 'PUT':
        const userId = req.body.id;
        const updates = req.body;
        
        if (updates.password) {
          updates.password = bcrypt.hashSync(updates.password, 10);
        }
        
        const updateFields = Object.keys(updates).filter(key => key !== 'id' && updates[key] !== undefined);
        const updateQuery = `UPDATE users SET ${updateFields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`;
        const updateValues = [...updateFields.map(field => updates[field]), userId];
        
        db.prepare(updateQuery).run(...updateValues);
        res.json({ message: 'User updated successfully' });
        break;

      case 'DELETE':
        const deleteUserId = req.query.id || req.body.id;
        db.prepare('DELETE FROM users WHERE id = ?').run(deleteUserId);
        res.json({ message: 'User deleted successfully' });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Users API error:', error);
    res.status(error.message === 'Authorization token required' || error.name === 'JsonWebTokenError' ? 401 : 500)
       .json({ error: error.message || 'Internal server error' });
  }
};