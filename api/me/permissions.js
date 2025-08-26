const jwt = require('jsonwebtoken');

// Import database - handle potential import issues
let initDatabase, db;
try {
  const dbModule = require('../../backend/config/database');
  initDatabase = dbModule.initDatabase;
  db = dbModule.db;
} catch (error) {
  console.error('Database module import error:', error);
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Initialize database once
let dbInitialized = false;

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Initialize database if not already done
  if (!dbInitialized) {
    try {
      console.log('Initializing database for permissions endpoint...');
      if (!initDatabase || !db) {
        throw new Error('Database modules not available');
      }
      initDatabase();
      dbInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database:', error.message);
      return res.status(500).json({ error: 'Database initialization failed', details: error.message });
    }
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // For the admin user, return all permissions
    if (decoded.username === 'admin') {
      // Get all modules and their permissions
      const modules = db.prepare('SELECT * FROM modules').all();
      const permissions = [];

      modules.forEach(module => {
        const actions = ['create', 'read', 'update', 'delete'];
        actions.forEach(action => {
          permissions.push({
            id: permissions.length + 1,
            name: `${action}_${module.name.toLowerCase()}`,
            action: action,
            module: module.name,
            module_name: module.name,
            description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.name.toLowerCase()}`
          });
        });
      });

      console.log('Returning permissions for admin:', permissions.length);
      res.json(permissions);
    } else {
      // For other users, return empty permissions for now
      res.json([]);
    }
  } catch (error) {
    console.error('Permissions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions', details: error.message });
  }
}