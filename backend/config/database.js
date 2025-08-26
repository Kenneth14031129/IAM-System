const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const path = require('path');
const fs = require('fs');

// Use persistent database file for production
const dbPath = process.env.NODE_ENV === 'production' ? 
  path.join('/tmp', 'database.db') : 
  path.join(__dirname, '..', 'database.db');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

function initDatabase() {
  // Check if database is already initialized
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  
  if (!tableExists) {
    createTables();
    seedDatabase();
    console.log('Database initialized with seed data');
  } else {
    console.log('Database already exists, skipping initialization');
  }
}

function createTables() {
  // Users table
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Groups table
  db.exec(`
    CREATE TABLE groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Roles table
  db.exec(`
    CREATE TABLE roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Modules table
  db.exec(`
    CREATE TABLE modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Permissions table
  db.exec(`
    CREATE TABLE permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      action TEXT NOT NULL,
      module_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (module_id) REFERENCES modules (id),
      UNIQUE(action, module_id)
    )
  `);

  // User-Group relationships
  db.exec(`
    CREATE TABLE user_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      group_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (group_id) REFERENCES groups (id),
      UNIQUE(user_id, group_id)
    )
  `);

  // Group-Role relationships
  db.exec(`
    CREATE TABLE group_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      role_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups (id),
      FOREIGN KEY (role_id) REFERENCES roles (id),
      UNIQUE(group_id, role_id)
    )
  `);

  // Role-Permission relationships
  db.exec(`
    CREATE TABLE role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER,
      permission_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles (id),
      FOREIGN KEY (permission_id) REFERENCES permissions (id),
      UNIQUE(role_id, permission_id)
    )
  `);
}

function seedDatabase() {
  const modules = [
    { name: 'Users', description: 'User management' },
    { name: 'Groups', description: 'Group management' },
    { name: 'Roles', description: 'Role management' },
    { name: 'Modules', description: 'Module management' },
    { name: 'Permissions', description: 'Permission management' }
  ];

  const insertModule = db.prepare('INSERT INTO modules (name, description) VALUES (?, ?)');
  modules.forEach(module => insertModule.run(module.name, module.description));

  const actions = ['create', 'read', 'update', 'delete'];
  const insertPermission = db.prepare('INSERT INTO permissions (name, action, module_id, description) VALUES (?, ?, ?, ?)');
  
  const moduleRecords = db.prepare('SELECT * FROM modules').all();
  moduleRecords.forEach(module => {
    actions.forEach(action => {
      insertPermission.run(
        `${action}_${module.name.toLowerCase()}`,
        action,
        module.id,
        `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.name.toLowerCase()}`
      );
    });
  });

  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const insertUser = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
  insertUser.run('admin', 'admin@example.com', hashedPassword);

  const insertGroup = db.prepare('INSERT INTO groups (name, description) VALUES (?, ?)');
  insertGroup.run('Administrators', 'Full system access');

  const insertRole = db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)');
  insertRole.run('Admin', 'Administrator role with all permissions');

  const insertUserGroup = db.prepare('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)');
  insertUserGroup.run(1, 1);

  const insertGroupRole = db.prepare('INSERT INTO group_roles (group_id, role_id) VALUES (?, ?)');
  insertGroupRole.run(1, 1);

  const permissions = db.prepare('SELECT id FROM permissions').all();
  const insertRolePermission = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
  permissions.forEach(permission => {
    insertRolePermission.run(1, permission.id);
  });
}

module.exports = { db, initDatabase };