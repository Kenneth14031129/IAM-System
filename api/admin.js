const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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

// Consolidated CRUD operations
const handleUsers = async (req, res) => {
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
      res.json({ id: result.lastInsertRowid, username, email, message: 'User created successfully' });
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
};

const handleGroups = async (req, res) => {
  switch (req.method) {
    case 'GET':
      const groups = db.prepare('SELECT * FROM groups ORDER BY created_at DESC').all();
      res.json(groups);
      break;
    case 'POST':
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Group name is required' });
      const result = db.prepare('INSERT INTO groups (name, description) VALUES (?, ?)').run(name, description || '');
      res.json({ id: result.lastInsertRowid, name, description: description || '', message: 'Group created successfully' });
      break;
    case 'PUT':
      const groupId = req.body.id;
      const { name: updateName, description: updateDesc } = req.body;
      if (!updateName) return res.status(400).json({ error: 'Group name is required' });
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
};

const handleRoles = async (req, res) => {
  switch (req.method) {
    case 'GET':
      const roles = db.prepare('SELECT * FROM roles ORDER BY created_at DESC').all();
      res.json(roles);
      break;
    case 'POST':
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Role name is required' });
      const result = db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)').run(name, description || '');
      res.json({ id: result.lastInsertRowid, name, description: description || '', message: 'Role created successfully' });
      break;
    case 'PUT':
      const roleId = req.body.id;
      const { name: updateName, description: updateDesc } = req.body;
      if (!updateName) return res.status(400).json({ error: 'Role name is required' });
      db.prepare('UPDATE roles SET name = ?, description = ? WHERE id = ?').run(updateName, updateDesc || '', roleId);
      res.json({ message: 'Role updated successfully' });
      break;
    case 'DELETE':
      const deleteRoleId = req.query.id || req.body.id;
      db.prepare('DELETE FROM roles WHERE id = ?').run(deleteRoleId);
      res.json({ message: 'Role deleted successfully' });
      break;
    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
};

const handleModules = async (req, res) => {
  switch (req.method) {
    case 'GET':
      const modules = db.prepare('SELECT * FROM modules ORDER BY created_at DESC').all();
      res.json(modules);
      break;
    case 'POST':
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Module name is required' });
      const result = db.prepare('INSERT INTO modules (name, description) VALUES (?, ?)').run(name, description || '');
      res.json({ id: result.lastInsertRowid, name, description: description || '', message: 'Module created successfully' });
      break;
    case 'PUT':
      const moduleId = req.body.id;
      const { name: updateName, description: updateDesc } = req.body;
      if (!updateName) return res.status(400).json({ error: 'Module name is required' });
      db.prepare('UPDATE modules SET name = ?, description = ? WHERE id = ?').run(updateName, updateDesc || '', moduleId);
      res.json({ message: 'Module updated successfully' });
      break;
    case 'DELETE':
      const deleteModuleId = req.query.id || req.body.id;
      db.prepare('DELETE FROM modules WHERE id = ?').run(deleteModuleId);
      res.json({ message: 'Module deleted successfully' });
      break;
    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
};

const handlePermissions = async (req, res) => {
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
      res.json({ id: result.lastInsertRowid, name, action, module_id, description: description || '', message: 'Permission created successfully' });
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
};

const handleUserGroups = async (req, res) => {
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
      res.json({ id: result.lastInsertRowid, user_id, group_id, message: 'User assigned to group successfully' });
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
};

const handleRoleGroups = async (req, res) => {
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
      res.json({ id: result.lastInsertRowid, group_id, role_id, message: 'Role assigned to group successfully' });
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

    // Route based on query parameter
    const { entity } = req.query;
    
    switch (entity) {
      case 'users':
        await handleUsers(req, res);
        break;
      case 'groups':
        await handleGroups(req, res);
        break;
      case 'roles':
        await handleRoles(req, res);
        break;
      case 'modules':
        await handleModules(req, res);
        break;
      case 'permissions':
        await handlePermissions(req, res);
        break;
      case 'user-groups':
        await handleUserGroups(req, res);
        break;
      case 'role-groups':
        await handleRoleGroups(req, res);
        break;
      default:
        res.status(404).json({ error: 'Entity not found' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(error.message === 'Authorization token required' || error.name === 'JsonWebTokenError' ? 401 : 500)
       .json({ error: error.message || 'Internal server error' });
  }
};