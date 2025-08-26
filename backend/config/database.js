const bcrypt = require('bcryptjs');

// Serverless-compatible in-memory data store
let dataStore = {
  users: [],
  groups: [],
  roles: [],
  modules: [],
  permissions: [],
  user_groups: [],
  group_roles: [],
  role_permissions: []
};

// Simple database operations for serverless
const db = {
  prepare: (query) => ({
    get: (params) => {
      if (query.includes('SELECT * FROM users WHERE username = ?')) {
        return dataStore.users.find(user => user.username === params);
      }
      return null;
    },
    all: () => {
      if (query.includes('SELECT * FROM modules')) return dataStore.modules;
      if (query.includes('SELECT id FROM permissions')) return dataStore.permissions;
      return [];
    },
    run: (param1, param2, param3, param4) => {
      if (query.includes('INSERT INTO modules')) {
        const id = dataStore.modules.length + 1;
        dataStore.modules.push({ id, name: param1, description: param2 });
        return { lastInsertRowid: id };
      }
      if (query.includes('INSERT INTO permissions')) {
        const id = dataStore.permissions.length + 1;
        dataStore.permissions.push({ id, name: param1, action: param2, module_id: param3, description: param4 });
        return { lastInsertRowid: id };
      }
      if (query.includes('INSERT INTO users')) {
        const id = dataStore.users.length + 1;
        dataStore.users.push({ id, username: param1, email: param2, password: param3 });
        return { lastInsertRowid: id };
      }
      if (query.includes('INSERT INTO groups')) {
        const id = dataStore.groups.length + 1;
        dataStore.groups.push({ id, name: param1, description: param2 });
        return { lastInsertRowid: id };
      }
      if (query.includes('INSERT INTO roles')) {
        const id = dataStore.roles.length + 1;
        dataStore.roles.push({ id, name: param1, description: param2 });
        return { lastInsertRowid: id };
      }
      return { lastInsertRowid: 1 };
    }
  }),
  exec: () => {} // No-op for table creation in serverless
};

function initDatabase() {
  try {
    // Always recreate for in-memory database
    createTables();
    seedDatabase();
    console.log('Database initialized with seed data');
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
}

function createTables() {
  // No-op for serverless - using in-memory data store
  console.log('Tables created (in-memory)');
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