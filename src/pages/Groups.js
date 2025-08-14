import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { groupsThunks, usersThunks, rolesThunks, assignUserToGroup, assignRoleToGroup, clearGroupsError } from '../store/store';
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
  Shield
} from 'lucide-react';

const Groups = () => {
  const dispatch = useDispatch();
  const { items: groups, loading, error } = useSelector(state => state.groups);
  const { items: users } = useSelector(state => state.users);
  const { items: roles } = useSelector(state => state.roles);
  
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

  useEffect(() => {
    dispatch(groupsThunks.fetchAll());
    dispatch(usersThunks.fetchAll());
    dispatch(rolesThunks.fetchAll());
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
      } else {
        await dispatch(groupsThunks.create(formData)).unwrap();
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save group:', error);
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
      } else if (assignType === 'role' && assignFormData.roleId) {
        await dispatch(assignRoleToGroup({
          groupId: selectedGroup.id,
          roleId: parseInt(assignFormData.roleId)
        })).unwrap();
      }
      handleCloseAssignModal();
    } catch (error) {
      console.error('Failed to assign:', error);
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

  const handleDelete = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      try {
        await dispatch(groupsThunks.delete(groupId)).unwrap();
      } catch (error) {
        console.error('Failed to delete group:', error);
      }
    }
  };

  const handleAssignUser = (group) => {
    setSelectedGroup(group);
    setAssignType('user');
    setAssignFormData({ userId: '', roleId: '' });
    setShowAssignModal(true);
  };

  // Assign roles to groups (additional functionality)
  const handleAssignRole = (group) => {
    setSelectedGroup(group);
    setAssignType('role');
    setAssignFormData({ userId: '', roleId: '' });
    setShowAssignModal(true);
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
  };

  const handleAddNew = () => {
    setEditingGroup(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-600 mt-2">Manage user groups and assign users and roles to them.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
        >
          <div className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add Group
          </div>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => dispatch(clearGroupsError())}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading groups...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <UserX className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No groups</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new group.</p>
            <div className="mt-6">
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Group
              </button>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <UsersRound className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                    <p className="text-sm text-gray-500">ID: {group.id}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(group)}
                    className="text-blue-600 hover:text-blue-900 p-1"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="text-red-600 hover:text-red-900 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4">{group.description || 'No description'}</p>

              <div className="space-y-3">
                <button
                  onClick={() => handleAssignUser(group)}
                  className="w-full flex items-center justify-center px-3 py-2 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 transition duration-200"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign User
                </button>

                {/* Assign roles to groups (additional functionality) */}
                <button
                  onClick={() => handleAssignRole(group)}
                  className="w-full flex items-center justify-center px-3 py-2 border border-green-300 text-green-700 rounded-md hover:bg-green-50 transition duration-200"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Assign Role
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingGroup ? 'Edit Group' : 'Add New Group'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Group Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter group name"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter group description"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editingGroup ? 'Update Group' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign User/Role Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Assign {assignType === 'user' ? 'User' : 'Role'} to {selectedGroup?.name}
                </h3>
                <button
                  onClick={handleCloseAssignModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-4">
                {assignType === 'user' ? (
                  <div>
                    <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                      Select User
                    </label>
                    <select
                      id="userId"
                      name="userId"
                      value={assignFormData.userId}
                      onChange={handleAssignInputChange}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a user</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="roleId" className="block text-sm font-medium text-gray-700">
                      Select Role
                    </label>
                    <select
                      id="roleId"
                      name="roleId"
                      value={assignFormData.roleId}
                      onChange={handleAssignInputChange}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseAssignModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Assign {assignType === 'user' ? 'User' : 'Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;