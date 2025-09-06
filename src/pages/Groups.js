import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { groupsThunks, usersThunks, assignUserToGroup, clearGroupsError, removeUserFromGroup, } from '../store/store';
import { 
  Plus, 
  AlertCircle, 
  X, 
  Loader2, 
  UsersRound, 
  UserX, 
  Edit, 
  Trash2,
  UserPlus,
} from 'lucide-react';
import axios from 'axios';

const Groups = () => {
  const dispatch = useDispatch();
  const { items: groups, loading, error } = useSelector(state => state.groups);
  const { items: users } = useSelector(state => state.users);
  const [groupUsers, setGroupUsers] = useState({});
  const [groupRoles, setGroupRoles] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [assignFormData, setAssignFormData] = useState({
    userId: '',
    roleId: ''
  });
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [groupAssignedUsers, setGroupAssignedUsers] = useState([]);
  const [showRemoveUserModal, setShowRemoveUserModal] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  const fetchGroupAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const userGroupsResponse = await axios.get('/api/user-groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const roleGroupsResponse = await axios.get('/api/role-groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const usersMap = {};
      userGroupsResponse.data.forEach(ug => {
        if (!usersMap[ug.group_id]) {
          usersMap[ug.group_id] = [];
        }
        usersMap[ug.group_id].push({
          id: ug.user_id,
          username: ug.username,
          email: ug.email
        });
      });
      setGroupUsers(usersMap);
      
      const rolesMap = {};
      roleGroupsResponse.data.forEach(rg => {
        if (!rolesMap[rg.group_id]) {
          rolesMap[rg.group_id] = [];
        }
        rolesMap[rg.group_id].push({
          id: rg.role_id,
          name: rg.role_name
        });
      });
      setGroupRoles(rolesMap);
      
    } catch (error) {
      console.error('Failed to fetch group assignments:', error);
    }
  };

  useEffect(() => {
    dispatch(groupsThunks.fetchAll());
    dispatch(usersThunks.fetchAll());
    fetchGroupAssignments();
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearGroupsError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAssignInputChange = (e) => {
    setAssignFormData({
      ...assignFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await dispatch(groupsThunks.update({ 
          id: editingGroup.id, 
          data: formData 
        })).unwrap();
        showToast('Group updated successfully!', 'success');
      } else {
        await dispatch(groupsThunks.create(formData)).unwrap();
        showToast('Group created successfully!', 'success');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save group:', error);
      showToast(error.message || 'Failed to save group', 'error');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      if (assignType === 'user' && assignFormData.userId) {
        await dispatch(assignUserToGroup({
          groupId: selectedGroup.id,
          userId: parseInt(assignFormData.userId)
        })).unwrap();
        showToast('User assigned to group successfully!', 'success');
        
        const assignedUser = users.find(u => u.id === parseInt(assignFormData.userId));
        if (assignedUser) {
          setGroupAssignedUsers(prev => [...prev, {
            id: assignedUser.id,
            username: assignedUser.username,
            email: assignedUser.email
          }]);
        }
        
        setAssignFormData({ userId: '', roleId: '' });
        
        fetchGroupAssignments();
      }
    } catch (error) {
      console.error('Failed to assign:', error);
      showToast(error.message || `Failed to assign ${assignType}`, 'error');
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await dispatch(groupsThunks.delete(groupToDelete.id)).unwrap();
      showToast('Group deleted successfully!', 'success');
      setShowDeleteModal(false);
      setGroupToDelete(null);
    } catch (error) {
      showToast(error.message || 'Failed to delete group', 'error');
      setShowDeleteModal(false);
      setGroupToDelete(null);
    }
  };

  const handleShowDeleteModal = (group) => {
    setGroupToDelete(group);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setGroupToDelete(null);
  };

  const handleAssignUser = (group) => {
    setSelectedGroup(group);
    setAssignType('user');
    setAssignFormData({ userId: '', roleId: '' });
    
    const assignedUsers = groupUsers[group.id] || [];
    setGroupAssignedUsers(assignedUsers);
    
    setShowAssignModal(true);
  };

  const handleShowRemoveUserModal = (user) => {
    setUserToRemove(user);
    setShowRemoveUserModal(true);
  };

  const handleConfirmRemoveUser = async () => {
    try {
      await dispatch(removeUserFromGroup({ 
        groupId: selectedGroup.id, 
        userId: userToRemove.id 
      })).unwrap();
      showToast('User removed from group successfully!', 'success');
      
      setGroupAssignedUsers(prev => prev.filter(user => user.id !== userToRemove.id));
      
      fetchGroupAssignments();
    } catch (error) {
      console.error('Failed to remove user from group:', error);
      showToast(error.message || 'Failed to remove user from group', 'error');
    } finally {
      setShowRemoveUserModal(false);
      setUserToRemove(null);
    }
  };

  const handleCancelRemoveUser = () => {
    setShowRemoveUserModal(false);
    setUserToRemove(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGroup(null);
    setFormData({ name: '', description: '' });
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedGroup(null);
    setAssignType('');
    setAssignFormData({ userId: '', roleId: '' });
    setGroupAssignedUsers([]);
    setShowRemoveUserModal(false); 
    setUserToRemove(null);         
  };

  const handleAddNew = () => {
    setEditingGroup(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage user groups and assign users and roles to them.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 text-sm sm:text-base w-full sm:w-auto"
        >
          <div className="flex items-center justify-center">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Add Group
          </div>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 sm:p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="ml-3 flex-1">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => dispatch(clearGroupsError())}
              className="ml-3 text-red-400 hover:text-red-600 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-8 sm:py-12">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600 text-sm sm:text-base">Loading groups...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-full text-center py-8 sm:py-12 px-4">
            <UserX className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No groups</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new group.</p>
            <div className="mt-6">
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                New Group
              </button>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UsersRound className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{group.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500">ID: {group.id}</p>
                  </div>
                </div>
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={() => handleEdit(group)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                    title="Edit group"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleShowDeleteModal(group)}
                    className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                    title="Delete group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-3 sm:mb-4 flex-grow">
                {group.description || 'No description'}
              </p>

              {/* Assigned Users */}
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1 sm:mb-2">Assigned Users:</p>
                <div className="flex flex-wrap gap-1">
                  {groupUsers[group.id] && groupUsers[group.id].length > 0 ? (
                    groupUsers[group.id].slice(0, 3).map((user, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {user.username}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">No users assigned</span>
                  )}
                  {groupUsers[group.id] && groupUsers[group.id].length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      +{groupUsers[group.id].length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Assigned Roles */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-1 sm:mb-2">Assigned Roles:</p>
                <div className="flex flex-wrap gap-1">
                  {groupRoles[group.id] && groupRoles[group.id].length > 0 ? (
                    groupRoles[group.id].slice(0, 3).map((role, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {role.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">No roles assigned</span>
                  )}
                  {groupRoles[group.id] && groupRoles[group.id].length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      +{groupRoles[group.id].length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={() => handleAssignUser(group)}
                  className="w-full flex items-center justify-center px-3 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 transition duration-200 text-sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign User
                </button>
              </div>

              {/* Footer */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Created: {group.created_at ? new Date(group.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Group Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto border shadow-lg rounded-md bg-white max-w-md w-full">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingGroup ? 'Edit Group' : 'Add New Group'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter group name"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="block w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter group description"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto"
                  >
                    {editingGroup ? 'Update Group' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-10 mx-auto border shadow-lg rounded-md bg-white max-w-2xl w-full">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Manage Users for {selectedGroup?.name}
                </h3>
                <button
                  onClick={handleCloseAssignModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Currently Assigned Users */}
              {groupAssignedUsers.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Currently Assigned Users:</h4>
                  <div className="flex flex-wrap gap-2">
                    {groupAssignedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        <span>{user.username}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleShowRemoveUserModal(user);
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                          title="Remove from group"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assign New User Form */}
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                    Assign New User
                  </label>
                  {users.filter(user => !groupAssignedUsers.some(assignedUser => assignedUser.id === user.id)).length === 0 ? (
                    <div className="block w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                      No available users to assign
                    </div>
                  ) : (
                    <select
                      id="userId"
                      name="userId"
                      value={assignFormData.userId}
                      onChange={handleAssignInputChange}
                      className="block w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a user to assign</option>
                      {users
                        .filter(user => !groupAssignedUsers.some(assignedUser => assignedUser.id === user.id))
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.username} ({user.email})
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseAssignModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={!assignFormData.userId}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    Assign User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto border shadow-lg rounded-md bg-white max-w-md w-full">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Group
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete group <span className="font-semibold text-gray-700">"{groupToDelete.name}"</span>? 
                  This action cannot be undone and will permanently remove the group and all associated assignments.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete Group'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto z-50 p-4 rounded-md shadow-lg transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <div className="flex items-center">
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            )}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => setToast({ show: false, message: '', type: '' })}
              className={`ml-4 flex-shrink-0 ${
                toast.type === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Remove User Confirmation Modal */}
      {showRemoveUserModal && userToRemove && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto border shadow-lg rounded-md bg-white max-w-md w-full">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Remove User from Group
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to remove <span className="font-semibold text-gray-700">"{userToRemove.username}"</span> from group <span className="font-semibold text-gray-700">"{selectedGroup?.name}"</span>? 
                  This will revoke their group membership and associated permissions.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={handleCancelRemoveUser}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemoveUser}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 w-full sm:w-auto"
                >
                  Remove User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;