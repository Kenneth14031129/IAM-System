const express = require('express');
const { User, Group, Role, Module, Permission, UserGroup, GroupRole, RolePermission } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

router.get('/role-groups', authenticateToken, checkPermission('Roles', 'read'), async (req, res) => {
  try {
    const roleGroups = await GroupRole.find()
      .populate('group_id', 'name')
      .populate('role_id', 'name')
      .sort({ 'role_id.name': 1, 'group_id.name': 1 });
    
    const formattedRoleGroups = roleGroups.map(gr => ({
      role_id: gr.role_id._id,
      group_id: gr.group_id._id,
      group_name: gr.group_id.name,
      role_name: gr.role_id.name
    }));
    
    res.json(formattedRoleGroups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role-group relationships' });
  }
});

router.get('/user-access-report', authenticateToken, checkPermission('Users', 'read'), async (req, res) => {
  try {
    const userAccess = await UserGroup.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'groups',
          localField: 'group_id',
          foreignField: '_id',
          as: 'group'
        }
      },
      { $unwind: '$group' },
      {
        $lookup: {
          from: 'grouproles',
          localField: 'group_id',
          foreignField: 'group_id',
          as: 'groupRoles'
        }
      },
      { $unwind: '$groupRoles' },
      {
        $lookup: {
          from: 'roles',
          localField: 'groupRoles.role_id',
          foreignField: '_id',
          as: 'role'
        }
      },
      { $unwind: '$role' },
      {
        $lookup: {
          from: 'rolepermissions',
          localField: 'role._id',
          foreignField: 'role_id',
          as: 'rolePermissions'
        }
      },
      { $unwind: '$rolePermissions' },
      {
        $lookup: {
          from: 'permissions',
          localField: 'rolePermissions.permission_id',
          foreignField: '_id',
          as: 'permission'
        }
      },
      { $unwind: '$permission' },
      {
        $lookup: {
          from: 'modules',
          localField: 'permission.module_id',
          foreignField: '_id',
          as: 'module'
        }
      },
      { $unwind: '$module' },
      {
        $sort: {
          'user.username': 1,
          'group.name': 1,
          'role.name': 1,
          'module.name': 1,
          'permission.action': 1
        }
      }
    ]);
    
    const userMap = {};
    userAccess.forEach(row => {
      const userId = row.user._id.toString();
      if (!userMap[userId]) {
        userMap[userId] = {
          user: {
            id: userId,
            username: row.user.username,
            email: row.user.email
          },
          groups: {},
          permissions: new Set()
        };
      }
      
      const groupId = row.group._id.toString();
      if (!userMap[userId].groups[groupId]) {
        userMap[userId].groups[groupId] = {
          id: groupId,
          name: row.group.name,
          roles: {}
        };
      }
      
      const roleId = row.role._id.toString();
      if (!userMap[userId].groups[groupId].roles[roleId]) {
        userMap[userId].groups[groupId].roles[roleId] = {
          id: roleId,
          name: row.role.name,
          permissions: []
        };
      }
      
      userMap[userId].groups[groupId].roles[roleId].permissions.push({
        id: row.permission._id,
        name: row.permission.name,
        action: row.permission.action,
        module: row.module.name
      });
      
      userMap[userId].permissions.add(`${row.permission.action}_${row.module.name}`);
    });
    
    const result = Object.values(userMap).map(userData => ({
      user: userData.user,
      groups: Object.values(userData.groups).map(group => ({
        ...group,
        roles: Object.values(group.roles)
      })),
      totalPermissions: userData.permissions.size,
      uniquePermissions: Array.from(userData.permissions)
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate user access report' });
  }
});

router.get('/system-overview', authenticateToken, async (req, res) => {
  try {
    const stats = {
      users: await User.countDocuments(),
      groups: await Group.countDocuments(),
      roles: await Role.countDocuments(),
      modules: await Module.countDocuments(),
      permissions: await Permission.countDocuments(),
      userGroups: await UserGroup.countDocuments(),
      groupRoles: await GroupRole.countDocuments(),
      rolePermissions: await RolePermission.countDocuments()
    };
    
    const recentUsers = await User.find()
      .select('username created_at')
      .sort({ created_at: -1 })
      .limit(5);
    
    const recentGroups = await Group.find()
      .select('name created_at')
      .sort({ created_at: -1 })
      .limit(3);
    
    const recentRoles = await Role.find()
      .select('name created_at')
      .sort({ created_at: -1 })
      .limit(2);
    
    const recentActivity = [
      ...recentUsers.map(u => ({ type: 'user', name: u.username, created_at: u.created_at })),
      ...recentGroups.map(g => ({ type: 'group', name: g.name, created_at: g.created_at })),
      ...recentRoles.map(r => ({ type: 'role', name: r.name, created_at: r.created_at }))
    ]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);
    
    const permissionsByModule = await Module.aggregate([
      {
        $lookup: {
          from: 'permissions',
          localField: '_id',
          foreignField: 'module_id',
          as: 'permissions'
        }
      },
      {
        $project: {
          module_name: '$name',
          permission_count: { $size: '$permissions' }
        }
      },
      { $sort: { permission_count: -1 } }
    ]);
    
    const activeUsers = await User.aggregate([
      {
        $lookup: {
          from: 'usergroups',
          localField: '_id',
          foreignField: 'user_id',
          as: 'userGroups'
        }
      },
      {
        $project: {
          username: 1,
          group_count: { $size: '$userGroups' }
        }
      },
      { $sort: { group_count: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({
      stats,
      recentActivity,
      permissionsByModule,
      activeUsers
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system overview' });
  }
});

router.delete('/users/:userId/groups/:groupId', authenticateToken, checkPermission('Groups', 'update'), async (req, res) => {
  try {
    const { userId, groupId } = req.params;
    
    const relationship = await UserGroup.findOne({ user_id: userId, group_id: groupId });
    if (!relationship) {
      return res.status(404).json({ error: 'User is not assigned to this group' });
    }
    
    await UserGroup.deleteOne({ user_id: userId, group_id: groupId });
    res.status(200).json({ message: 'User removed from group successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove user from group' });
  }
});

router.get('/users/:userId/effective-permissions', authenticateToken, checkPermission('Users', 'read'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('id username email');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const permissions = await UserGroup.aggregate([
      { $match: { user_id: user._id } },
      {
        $lookup: {
          from: 'grouproles',
          localField: 'group_id',
          foreignField: 'group_id',
          as: 'groupRoles'
        }
      },
      { $unwind: '$groupRoles' },
      {
        $lookup: {
          from: 'rolepermissions',
          localField: 'groupRoles.role_id',
          foreignField: 'role_id',
          as: 'rolePermissions'
        }
      },
      { $unwind: '$rolePermissions' },
      {
        $lookup: {
          from: 'permissions',
          localField: 'rolePermissions.permission_id',
          foreignField: '_id',
          as: 'permission'
        }
      },
      { $unwind: '$permission' },
      {
        $lookup: {
          from: 'modules',
          localField: 'permission.module_id',
          foreignField: '_id',
          as: 'module'
        }
      },
      { $unwind: '$module' },
      {
        $lookup: {
          from: 'roles',
          localField: 'groupRoles.role_id',
          foreignField: '_id',
          as: 'role'
        }
      },
      { $unwind: '$role' },
      {
        $lookup: {
          from: 'groups',
          localField: 'group_id',
          foreignField: '_id',
          as: 'group'
        }
      },
      { $unwind: '$group' },
      {
        $group: {
          _id: {
            permissionId: '$permission._id',
            moduleId: '$module._id'
          },
          permission: { $first: '$permission' },
          module: { $first: '$module' },
          roles: { $addToSet: '$role.name' },
          groups: { $addToSet: '$group.name' }
        }
      },
      {
        $sort: {
          'module.name': 1,
          'permission.action': 1
        }
      }
    ]);
    
    const permissionsByModule = {};
    permissions.forEach(result => {
      const module = result.module.name;
      if (!permissionsByModule[module]) {
        permissionsByModule[module] = [];
      }
      permissionsByModule[module].push({
        id: result.permission._id,
        name: result.permission.name,
        action: result.permission.action,
        description: result.permission.description,
        grantedBy: {
          roles: result.roles,
          groups: result.groups
        }
      });
    });
    
    const allPermissions = permissions.map(result => ({
      id: result.permission._id,
      name: result.permission.name,
      action: result.permission.action,
      description: result.permission.description,
      module_name: result.module.name,
      roles: result.roles,
      groups: result.groups
    }));
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      totalPermissions: permissions.length,
      permissionsByModule,
      allPermissions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user effective permissions' });
  }
});

router.post('/users/:userId/check-permission', authenticateToken, checkPermission('Users', 'read'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { module, action } = req.body;
    
    if (!module || !action) {
      return res.status(400).json({ error: 'Module and action are required' });
    }
    
    const user = await User.findById(userId).select('id username');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const result = await UserGroup.aggregate([
      { $match: { user_id: user._id } },
      {
        $lookup: {
          from: 'grouproles',
          localField: 'group_id',
          foreignField: 'group_id',
          as: 'groupRoles'
        }
      },
      { $unwind: '$groupRoles' },
      {
        $lookup: {
          from: 'rolepermissions',
          localField: 'groupRoles.role_id',
          foreignField: 'role_id',
          as: 'rolePermissions'
        }
      },
      { $unwind: '$rolePermissions' },
      {
        $lookup: {
          from: 'permissions',
          localField: 'rolePermissions.permission_id',
          foreignField: '_id',
          as: 'permission'
        }
      },
      { $unwind: '$permission' },
      {
        $lookup: {
          from: 'modules',
          localField: 'permission.module_id',
          foreignField: '_id',
          as: 'module'
        }
      },
      { $unwind: '$module' },
      {
        $lookup: {
          from: 'roles',
          localField: 'groupRoles.role_id',
          foreignField: '_id',
          as: 'role'
        }
      },
      { $unwind: '$role' },
      {
        $lookup: {
          from: 'groups',
          localField: 'group_id',
          foreignField: '_id',
          as: 'group'
        }
      },
      { $unwind: '$group' },
      {
        $match: {
          'module.name': module,
          'permission.action': action
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          groups: { $addToSet: '$group.name' },
          roles: { $addToSet: '$role.name' }
        }
      }
    ]);
    
    const hasPermission = result.length > 0 && result[0].count > 0;
    
    res.json({
      user: {
        id: user._id,
        username: user.username
      },
      module: module,
      action: action,
      hasPermission: hasPermission,
      grantedThrough: hasPermission ? {
        groups: result[0].groups || [],
        roles: result[0].roles || []
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check user permission' });
  }
});

router.get('/orphaned-entities', authenticateToken, checkPermission('Users', 'read'), async (req, res) => {
  try {
    // Find users without groups
    const allUsers = await User.find().select('id username email');
    const usersWithGroups = await UserGroup.distinct('user_id');
    const orphanedUsers = allUsers.filter(user => 
      !usersWithGroups.some(ugUserId => ugUserId.equals(user._id))
    );
    
    // Find groups without users
    const allGroups = await Group.find().select('id name description');
    const groupsWithUsers = await UserGroup.distinct('group_id');
    const emptyGroups = allGroups.filter(group => 
      !groupsWithUsers.some(ugGroupId => ugGroupId.equals(group._id))
    );
    
    // Find groups without roles
    const groupsWithRoles = await GroupRole.distinct('group_id');
    const groupsWithoutRoles = allGroups.filter(group => 
      !groupsWithRoles.some(grGroupId => grGroupId.equals(group._id))
    );
    
    // Find roles not assigned to groups
    const allRoles = await Role.find().select('id name description');
    const rolesWithGroups = await GroupRole.distinct('role_id');
    const unassignedRoles = allRoles.filter(role => 
      !rolesWithGroups.some(grRoleId => grRoleId.equals(role._id))
    );
    
    // Find roles without permissions
    const rolesWithPermissions = await RolePermission.distinct('role_id');
    const rolesWithoutPermissions = allRoles.filter(role => 
      !rolesWithPermissions.some(rpRoleId => rpRoleId.equals(role._id))
    );
    
    // Find permissions not assigned to roles
    const allPermissions = await Permission.find().populate('module_id', 'name');
    const permissionsWithRoles = await RolePermission.distinct('permission_id');
    const unassignedPermissions = allPermissions.filter(permission => 
      !permissionsWithRoles.some(rpPermissionId => rpPermissionId.equals(permission._id))
    ).map(p => ({
      id: p._id,
      name: p.name,
      action: p.action,
      module_name: p.module_id.name
    }));
    
    // Find modules without permissions
    const allModules = await Module.find().select('id name description');
    const modulesWithPermissions = await Permission.distinct('module_id');
    const modulesWithoutPermissions = allModules.filter(module => 
      !modulesWithPermissions.some(pModuleId => pModuleId.equals(module._id))
    );
    
    res.json({
      orphanedUsers: orphanedUsers.map(u => ({ id: u._id, username: u.username, email: u.email })),
      emptyGroups: emptyGroups.map(g => ({ id: g._id, name: g.name, description: g.description })),
      groupsWithoutRoles: groupsWithoutRoles.map(g => ({ id: g._id, name: g.name, description: g.description })),
      unassignedRoles: unassignedRoles.map(r => ({ id: r._id, name: r.name, description: r.description })),
      rolesWithoutPermissions: rolesWithoutPermissions.map(r => ({ id: r._id, name: r.name, description: r.description })),
      unassignedPermissions,
      modulesWithoutPermissions: modulesWithoutPermissions.map(m => ({ id: m._id, name: m.name, description: m.description })),
      summary: {
        orphanedUsersCount: orphanedUsers.length,
        emptyGroupsCount: emptyGroups.length,
        groupsWithoutRolesCount: groupsWithoutRoles.length,
        unassignedRolesCount: unassignedRoles.length,
        rolesWithoutPermissionsCount: rolesWithoutPermissions.length,
        unassignedPermissionsCount: unassignedPermissions.length,
        modulesWithoutPermissionsCount: modulesWithoutPermissions.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orphaned entities' });
  }
});

router.post('/groups/:groupId/users/bulk', authenticateToken, checkPermission('Groups', 'update'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }
    
    const group = await Group.findById(groupId).select('id name');
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const validUsers = await User.find({ _id: { $in: userIds } }).select('id username');
    
    if (validUsers.length !== userIds.length) {
      return res.status(400).json({ error: 'One or more invalid user IDs' });
    }
    
    let assignedCount = 0;
    
    for (const userId of userIds) {
      try {
        const userGroup = new UserGroup({ user_id: userId, group_id: groupId });
        await userGroup.save();
        assignedCount++;
      } catch (error) {
        // Skip if already exists (duplicate key error)
        if (error.code !== 11000) {
          throw error;
        }
      }
    }
    
    res.status(201).json({
      message: `${assignedCount} users assigned to group "${group.name}" successfully`,
      group: { id: group._id, name: group.name },
      assigned: assignedCount,
      total: userIds.length,
      users: validUsers.map(u => ({ id: u._id, username: u.username }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk assign users to group' });
  }
});

router.get('/user-groups', authenticateToken, checkPermission('Users', 'read'), async (req, res) => {
  try {
    const userGroups = await UserGroup.find()
      .populate('group_id', 'name')
      .populate('user_id', 'username')
      .sort({ 'user_id.username': 1, 'group_id.name': 1 });
    
    const formattedUserGroups = userGroups.map(ug => ({
      user_id: ug.user_id._id,
      group_id: ug.group_id._id,
      group_name: ug.group_id.name,
      username: ug.user_id.username
    }));
    
    res.json(formattedUserGroups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user-group relationships' });
  }
});

module.exports = router;