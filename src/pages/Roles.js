import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  rolesThunks,
  groupsThunks,
  assignRoleToGroup,
  getRoleGroups,
  removeRoleFromGroup,
  clearRolesError 
} from '../store/store';
import { 
  Plus, 
  AlertCircle, 
  X, 
  Loader2, 
  Shield, 
  ShieldX, 
  Edit, 
  Trash2,
  Users,
} from 'lucide-react';


const Roles = () => {
  const dispatch = useDispatch();
  const { items: roles, loading, error } = useSelector(state => state.roles);
  const { items: groups } = useSelector(state => state.groups);
  const [roleGroups, setRoleGroups] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [roleGroupDetails, setRoleGroupDetails] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  const fetchRoleGroups = async () => {
    try {
      const response = await fetch('/api/role-groups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const groupsMap = {};
        data.forEach(rg => {
          if (!groupsMap[rg.role_id]) {
            groupsMap[rg.role_id] = [];
          }
          groupsMap[rg.role_id].push(rg.group_name);
        });
        setRoleGroups(groupsMap);
      }
    } catch (error) {
      console.error('Failed to fetch role groups:', error);
    }
  };

  const fetchRoleGroupDetails = async (roleId) => {
    try {
      const response = await dispatch(getRoleGroups(roleId)).unwrap();
      setRoleGroupDetails(prev => ({
        ...prev,
        [roleId]: response.groups
      }));
    } catch (error) {
      console.error('Failed to fetch role group details:', error);
    }
  };

  useEffect(() => {
    dispatch(rolesThunks.fetchAll());
    dispatch(groupsThunks.fetchAll());
    fetchRoleGroups();
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearRolesError());
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await dispatch(rolesThunks.update({ 
          id: editingRole.id, 
          data: formData 
        })).unwrap();
        showToast('Role updated successfully!', 'success');
      } else {
        await dispatch(rolesThunks.create(formData)).unwrap();
        showToast('Role created successfully!', 'success');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save role:', error);
      showToast(error.message || 'Failed to save role', 'error');
    }
  };

  const handleGroupAssignment = async (e) => {
    e.preventDefault();
    try {
      for (const groupId of selectedGroups) {
        await dispatch(assignRoleToGroup({
          groupId: parseInt(groupId),
          roleId: selectedRole.id
        })).unwrap();
      }
      showToast(`Role assigned to ${selectedGroups.length} group(s) successfully!`, 'success');
      handleCloseGroupModal();
      fetchRoleGroups();
      fetchRoleGroupDetails(selectedRole.id);
    } catch (error) {
      console.error('Failed to assign role to groups:', error);
      showToast(error.message || 'Failed to assign role to groups', 'error');
    }
  };

  const handleRemoveFromGroup = async (groupId, roleId) => {
    if (window.confirm('Are you sure you want to remove this role from the group?')) {
      try {
        await dispatch(removeRoleFromGroup({ groupId, roleId })).unwrap();
        showToast('Role removed from group successfully!', 'success');
        fetchRoleGroups();
        fetchRoleGroupDetails(roleId);
      } catch (error) {
        console.error('Failed to remove role from group:', error);
        showToast(error.message || 'Failed to remove role from group', 'error');
      }
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await dispatch(rolesThunks.delete(roleToDelete.id)).unwrap();
      showToast('Role deleted successfully!', 'success');
      setShowDeleteModal(false);
      setRoleToDelete(null);
    } catch (error) {
      console.error('Failed to delete role:', error);
      showToast(error.message || 'Failed to delete role', 'error');
      setShowDeleteModal(false);
      setRoleToDelete(null);
    }
  };

  const handleShowDeleteModal = (role) => {
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setRoleToDelete(null);
  };

  const handleAssignToGroups = (role) => {
    setSelectedRole(role);
    setSelectedGroups([]);
    setShowGroupModal(true);
    fetchRoleGroupDetails(role.id);
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({ name: '', description: '' });
  };

  const handleCloseGroupModal = () => {
    setShowGroupModal(false);
    setSelectedRole(null);
    setSelectedGroups([]);
  };

  const handleAddNew = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const getAvailableGroups = (roleId) => {
    const assignedGroups = roleGroupDetails[roleId] || [];
    const assignedGroupIds = assignedGroups.map(g => g.id);
    return groups.filter(group => !assignedGroupIds.includes(group.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-600 mt-2">Manage roles and assign permissions to define access levels.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
        >
          <div className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add Role
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
              onClick={() => dispatch(clearRolesError())}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading roles...</span>
          </div>
        ) : roles.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ShieldX className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No roles</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new role.</p>
            <div className="mt-6">
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Role
              </button>
            </div>
          </div>
        ) : (
          roles.map((role) => (
            <div key={role.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                    <p className="text-sm text-gray-500">ID: {role.id}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(role)}
                    className="text-blue-600 hover:text-blue-900 p-1"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleShowDeleteModal(role)}
                    className="text-red-600 hover:text-red-900 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4">{role.description || 'No description'}</p>

              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Assigned to Groups:</p>
                <div className="flex flex-wrap gap-1">
                  {roleGroups[role.id] && roleGroups[role.id].length > 0 ? (
                    roleGroups[role.id].map((groupName, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {groupName}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">No groups assigned</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleAssignToGroups(role)}
                  className="w-full flex items-center justify-center px-3 py-2 border border-green-300 text-green-700 rounded-md hover:bg-green-50 transition duration-200"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Assign to Groups
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Created: {role.created_at ? new Date(role.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingRole ? 'Edit Role' : 'Add New Role'}
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
                    Role Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter role name"
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
                    placeholder="Enter role description"
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
                    {editingRole ? 'Update Role' : 'Create Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Groups Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Assign {selectedRole?.name} to Groups
                </h3>
                <button
                  onClick={handleCloseGroupModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Current Assignments */}
              {roleGroupDetails[selectedRole?.id] && roleGroupDetails[selectedRole?.id].length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Currently Assigned to:</h4>
                  <div className="flex flex-wrap gap-2">
                    {roleGroupDetails[selectedRole?.id].map((group) => (
                      <div
                        key={group.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        <span>{group.name}</span>
                        <button
                          onClick={() => handleRemoveFromGroup(group.id, selectedRole.id)}
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

              <form onSubmit={handleGroupAssignment} className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Available Groups:</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {selectedRole && getAvailableGroups(selectedRole.id).length === 0 ? (
                      <p className="text-gray-500 text-sm">No additional groups available</p>
                    ) : (
                      selectedRole && getAvailableGroups(selectedRole.id).map((group) => (
                        <label
                          key={group.id}
                          className="flex items-center p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            value={group.id}
                            checked={selectedGroups.includes(group.id.toString())}
                            onChange={() => handleGroupToggle(group.id.toString())}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3">
                            <span className="text-sm font-medium text-gray-900">{group.name}</span>
                            {group.description && (
                              <p className="text-xs text-gray-500">{group.description}</p>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    {selectedGroups.length} group(s) selected
                  </p>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseGroupModal}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={selectedGroups.length === 0}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Assign to Groups
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && roleToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Role
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete role <span className="font-semibold text-gray-700">"{roleToDelete.name}"</span>? 
                  This action cannot be undone and will permanently remove the role and all associated permissions and group assignments.
                </p>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete Role'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <div className="flex items-center">
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <AlertCircle className="w-5 h-5 mr-3" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast({ show: false, message: '', type: '' })}
              className={`ml-4 ${
                toast.type === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;