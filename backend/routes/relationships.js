const express = require('express');
const { db } = require('../config/database');
const { authenticateToken, checkPermission } = require('../middleware/auth');

const router = express.Router();

router.get('/role-groups', authenticateToken, checkPermission('Roles', 'read'), (req, res) => {
  try {
    const roleGroups = db.prepare(`
      SELECT gr.role_id, gr.group_id, g.name as group_name, r.name as role_name
      FROM group_roles gr
      JOIN groups g ON gr.group_id = g.id
      JOIN roles r ON gr.role_id = r.id
      ORDER BY r.name, g.name
    `).all();
    res.json(roleGroups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role-group relationships' });
  }
});

router.get('/user-access-report', authenticateToken, checkPermission('Users', 'read'), (req, res) => {
  try {
    const userAccess = db.prepare(`
      SELECT 
        u.id as user_id,
        u.username,
        u.email,
        g.id as group_id,
        g.name as group_name,
        r.id as role_id,
        r.name as role_name,
        p.id as permission_id,
        p.name as permission_name,
        p.action,
        m.name as module_name
      FROM users u
      JOIN user_groups ug ON u.id = ug.user_id
      JOIN groups g ON ug.group_id = g.id
      JOIN group_roles gr ON g.id = gr.group_id
      JOIN roles r ON gr.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN modules m ON p.module_id = m.id
      ORDER BY u.username, g.name, r.name, m.name, p.action
    `).all();
    
    const userMap = {};
    userAccess.forEach(row => {
      const userId = row.user_id;
      if (!userMap[userId]) {
        userMap[userId] = {
          user: {
            id: userId,
            username: row.username,
            email: row.email
          },
          groups: {},
          permissions: new Set()
        };
      }
      
      const groupId = row.group_id;
      if (!userMap[userId].groups[groupId]) {
        userMap[userId].groups[groupId] = {
          id: groupId,
          name: row.group_name,
          roles: {}
        };
      }
      
      const roleId = row.role_id;
      if (!userMap[userId].groups[groupId].roles[roleId]) {
        userMap[userId].groups[groupId].roles[roleId] = {
          id: roleId,
          name: row.role_name,
          permissions: []
        };
      }
      
      userMap[userId].groups[groupId].roles[roleId].permissions.push({
        id: row.permission_id,
        name: row.permission_name,
        action: row.action,
        module: row.module_name
      });
      
      userMap[userId].permissions.add(`${row.action}_${row.module_name}`);
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

router.get('/system-overview', authenticateToken, (req, res) => {
  try {
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      groups: db.prepare('SELECT COUNT(*) as count FROM groups').get().count,
      roles: db.prepare('SELECT COUNT(*) as count FROM roles').get().count,
      modules: db.prepare('SELECT COUNT(*) as count FROM modules').get().count,
      permissions: db.prepare('SELECT COUNT(*) as count FROM permissions').get().count,
      userGroups: db.prepare('SELECT COUNT(*) as count FROM user_groups').get().count,
      groupRoles: db.prepare('SELECT COUNT(*) as count FROM group_roles').get().count,
      rolePermissions: db.prepare('SELECT COUNT(*) as count FROM role_permissions').get().count
    };
    
    const recentUsers = db.prepare(`
      SELECT 'user' as type, username as name, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `).all();
    
    const recentGroups = db.prepare(`
      SELECT 'group' as type, name, created_at 
      FROM groups 
      ORDER BY created_at DESC 
      LIMIT 3
    `).all();
    
    const recentRoles = db.prepare(`
      SELECT 'role' as type, name, created_at 
      FROM roles 
      ORDER BY created_at DESC 
      LIMIT 2
    `).all();
    
    const recentActivity = [...recentUsers, ...recentGroups, ...recentRoles]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);
    
    const permissionsByModule = db.prepare(`
      SELECT m.name as module_name, COUNT(p.id) as permission_count
      FROM modules m
      LEFT JOIN permissions p ON m.id = p.module_id
      GROUP BY m.id, m.name
      ORDER BY permission_count DESC
    `).all();
    
    const activeUsers = db.prepare(`
      SELECT u.username, COUNT(ug.group_id) as group_count
      FROM users u
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      GROUP BY u.id, u.username
      ORDER BY group_count DESC
      LIMIT 5
    `).all();
    
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

router.delete('/users/:userId/groups/:groupId', authenticateToken, checkPermission('Groups', 'update'), (req, res) => {
  try {
    const { userId, groupId } = req.params;
    
    const relationship = db.prepare('SELECT id FROM user_groups WHERE user_id = ? AND group_id = ?').get(userId, groupId);
    if (!relationship) {
      return res.status(404).json({ error: 'User is not assigned to this group' });
    }
    
    db.prepare('DELETE FROM user_groups WHERE user_id = ? AND group_id = ?').run(userId, groupId);
    res.status(200).json({ message: 'User removed from group successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove user from group' });
  }
});

router.get('/users/:userId/effective-permissions', authenticateToken, checkPermission('Users', 'read'), (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const permissions = db.prepare(`
      SELECT DISTINCT 
        p.id,
        p.name,
        p.action,
        p.description,
        m.name as module_name,
        r.name as role_name,
        g.name as group_name
      FROM permissions p
      JOIN modules m ON p.module_id = m.id
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN roles r ON rp.role_id = r.id
      JOIN group_roles gr ON r.id = gr.role_id
      JOIN groups g ON gr.group_id = g.id
      JOIN user_groups ug ON g.id = ug.group_id
      WHERE ug.user_id = ?
      ORDER BY m.name, p.action
    `).all(userId);
    
    const permissionsByModule = {};
    permissions.forEach(permission => {
      const module = permission.module_name;
      if (!permissionsByModule[module]) {
        permissionsByModule[module] = [];
      }
      permissionsByModule[module].push({
        id: permission.id,
        name: permission.name,
        action: permission.action,
        description: permission.description,
        grantedBy: {
          role: permission.role_name,
          group: permission.group_name
        }
      });
    });
    
    res.json({
      user,
      totalPermissions: permissions.length,
      permissionsByModule,
      allPermissions: permissions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user effective permissions' });
  }
});

router.post('/users/:userId/check-permission', authenticateToken, checkPermission('Users', 'read'), (req, res) => {
  try {
    const { userId } = req.params;
    const { module, action } = req.body;
    
    if (!module || !action) {
      return res.status(400).json({ error: 'Module and action are required' });
    }
    
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const query = `
      SELECT COUNT(*) as count, 
             GROUP_CONCAT(DISTINCT g.name) as groups,
             GROUP_CONCAT(DISTINCT r.name) as roles
      FROM permissions p
      JOIN modules m ON p.module_id = m.id
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN roles r ON rp.role_id = r.id
      JOIN group_roles gr ON r.id = gr.role_id
      JOIN groups g ON gr.group_id = g.id
      JOIN user_groups ug ON g.id = ug.group_id
      WHERE ug.user_id = ? AND m.name = ? AND p.action = ?
    `;
    
    const result = db.prepare(query).get(userId, module, action);
    
    res.json({
      user: user,
      module: module,
      action: action,
      hasPermission: result.count > 0,
      grantedThrough: result.count > 0 ? {
        groups: result.groups ? result.groups.split(',') : [],
        roles: result.roles ? result.roles.split(',') : []
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check user permission' });
  }
});

router.get('/orphaned-entities', authenticateToken, checkPermission('Users', 'read'), (req, res) => {
  try {
    const orphanedUsers = db.prepare(`
      SELECT u.id, u.username, u.email
      FROM users u
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      WHERE ug.user_id IS NULL
    `).all();
    
    const emptyGroups = db.prepare(`
      SELECT g.id, g.name, g.description
      FROM groups g
      LEFT JOIN user_groups ug ON g.id = ug.group_id
      WHERE ug.group_id IS NULL
    `).all();
    
    const groupsWithoutRoles = db.prepare(`
      SELECT g.id, g.name, g.description
      FROM groups g
      LEFT JOIN group_roles gr ON g.id = gr.group_id
      WHERE gr.group_id IS NULL
    `).all();
    
    const unassignedRoles = db.prepare(`
      SELECT r.id, r.name, r.description
      FROM roles r
      LEFT JOIN group_roles gr ON r.id = gr.role_id
      WHERE gr.role_id IS NULL
    `).all();
    
    const rolesWithoutPermissions = db.prepare(`
      SELECT r.id, r.name, r.description
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      WHERE rp.role_id IS NULL
    `).all();
    
    const unassignedPermissions = db.prepare(`
      SELECT p.id, p.name, p.action, m.name as module_name
      FROM permissions p
      JOIN modules m ON p.module_id = m.id
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.permission_id IS NULL
    `).all();
    
    const modulesWithoutPermissions = db.prepare(`
      SELECT m.id, m.name, m.description
      FROM modules m
      LEFT JOIN permissions p ON m.id = p.module_id
      WHERE p.module_id IS NULL
    `).all();
    
    res.json({
      orphanedUsers,
      emptyGroups,
      groupsWithoutRoles,
      unassignedRoles,
      rolesWithoutPermissions,
      unassignedPermissions,
      modulesWithoutPermissions,
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

router.post('/groups/:groupId/users/bulk', authenticateToken, checkPermission('Groups', 'update'), (req, res) => {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }
    
    const group = db.prepare('SELECT id, name FROM groups WHERE id = ?').get(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const validUsers = db.prepare(`
      SELECT id, username FROM users WHERE id IN (${userIds.map(() => '?').join(',')})
    `).all(...userIds);
    
    if (validUsers.length !== userIds.length) {
      return res.status(400).json({ error: 'One or more invalid user IDs' });
    }
    
    const insert = db.prepare('INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (?, ?)');
    let assignedCount = 0;
    
    userIds.forEach(userId => {
      const result = insert.run(userId, groupId);
      if (result.changes > 0) {
        assignedCount++;
      }
    });
    
    res.status(201).json({
      message: `${assignedCount} users assigned to group "${group.name}" successfully`,
      group: group,
      assigned: assignedCount,
      total: userIds.length,
      users: validUsers
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk assign users to group' });
  }
});

router.get('/user-groups', authenticateToken, checkPermission('Users', 'read'), (req, res) => {
  try {
    const userGroups = db.prepare(`
      SELECT ug.user_id, ug.group_id, g.name as group_name, u.username
      FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      JOIN users u ON ug.user_id = u.id
      ORDER BY u.username, g.name
    `).all();
    res.json(userGroups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user-group relationships' });
  }
});

module.exports = router;