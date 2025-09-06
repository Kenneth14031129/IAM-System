const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️ MONGODB_URI not set. Please configure MongoDB connection in .env file');
      console.log('For local MongoDB: MONGODB_URI=mongodb://localhost:27017/iam-system');
      console.log('For MongoDB Atlas: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/iam-system');
      throw new Error('MongoDB URI not configured');
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

// Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  created_at: { type: Date, default: Date.now }
});

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  created_at: { type: Date, default: Date.now }
});

const ModuleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  created_at: { type: Date, default: Date.now }
});

const PermissionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  action: { type: String, required: true },
  module_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  description: String,
  created_at: { type: Date, default: Date.now }
});

const UserGroupSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  created_at: { type: Date, default: Date.now }
});

const GroupRoleSchema = new mongoose.Schema({
  group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  created_at: { type: Date, default: Date.now }
});

const RolePermissionSchema = new mongoose.Schema({
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  permission_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission', required: true },
  created_at: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', UserSchema);
const Group = mongoose.model('Group', GroupSchema);
const Role = mongoose.model('Role', RoleSchema);
const Module = mongoose.model('Module', ModuleSchema);
const Permission = mongoose.model('Permission', PermissionSchema);
const UserGroup = mongoose.model('UserGroup', UserGroupSchema);
const GroupRole = mongoose.model('GroupRole', GroupRoleSchema);
const RolePermission = mongoose.model('RolePermission', RolePermissionSchema);

async function initDatabase() {
  try {
    await connectDB();
    await seedDatabase();
    console.log('Database initialized with seed data');
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
}

async function seedDatabase() {
  try {
    // Check if data already exists
    const existingUser = await User.findOne({ username: 'admin' });
    if (existingUser) {
      console.log('Database already seeded');
      return;
    }

    const modules = [
      { name: 'Users', description: 'User management' },
      { name: 'Groups', description: 'Group management' },
      { name: 'Roles', description: 'Role management' },
      { name: 'Modules', description: 'Module management' },
      { name: 'Permissions', description: 'Permission management' }
    ];

    const createdModules = await Module.insertMany(modules);

    const actions = ['create', 'read', 'update', 'delete'];
    const permissions = [];
    
    createdModules.forEach(module => {
      actions.forEach(action => {
        permissions.push({
          name: `${action}_${module.name.toLowerCase()}`,
          action: action,
          module_id: module._id,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.name.toLowerCase()}`
        });
      });
    });

    const createdPermissions = await Permission.insertMany(permissions);

    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword
    });

    const adminGroup = await Group.create({
      name: 'Administrators',
      description: 'Full system access'
    });

    const adminRole = await Role.create({
      name: 'Admin',
      description: 'Administrator role with all permissions'
    });

    await UserGroup.create({
      user_id: adminUser._id,
      group_id: adminGroup._id
    });

    await GroupRole.create({
      group_id: adminGroup._id,
      role_id: adminRole._id
    });

    const rolePermissions = createdPermissions.map(permission => ({
      role_id: adminRole._id,
      permission_id: permission._id
    }));
    
    await RolePermission.insertMany(rolePermissions);
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Seed database error:', error);
    throw error;
  }
}

module.exports = { 
  connectDB, 
  initDatabase, 
  User, 
  Group, 
  Role, 
  Module, 
  Permission, 
  UserGroup, 
  GroupRole, 
  RolePermission 
};