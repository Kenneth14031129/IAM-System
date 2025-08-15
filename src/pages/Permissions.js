import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { permissionsThunks, modulesThunks, rolesThunks, assignPermissionToRole, clearPermissionsError } from '../store/store';
import { 
  Plus, 
  AlertCircle, 
  X, 
  Loader2, 
  Key, 
  KeyRound, 
  Edit, 
  Trash2,
  Shield,
  Eye,
  Edit3,
  Trash,
  PlusCircle
} from 'lucide-react';

const Permissions = () => {
  const dispatch = useDispatch();
  const { items: permissions, loading, error } = useSelector(state => state.permissions);
  const { items: modules } = useSelector(state => state.modules);
  const { items: roles } = useSelector(state => state.roles);
  const [rolePermissions, setRolePermissions] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [editingPermission, setEditingPermission] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    action: '',
    module_id: '',
    description: ''
  });
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  useEffect(() => {
    dispatch(permissionsThunks.fetchAll());
    dispatch(modulesThunks.fetchAll());
    dispatch(rolesThunks.fetchAll());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearPermissionsError());
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
      if (editingPermission) {
        await dispatch(permissionsThunks.update({ 
          id: editingPermission.id, 
          data: formData 
        })).unwrap();
        showToast('Permission updated successfully!', 'success');
      } else {
        await dispatch(permissionsThunks.create(formData)).unwrap();
        showToast('Permission created successfully!', 'success');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save permission:', error);
      showToast(error.message || 'Failed to save permission', 'error');
    }
  };

  const fetchRolePermissions = async (permissionId) => {
    try {
      const response = await fetch(`/api/permissions/${permissionId}/roles`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const assignedRoleIds = data.roles.map(role => role.id);
        setRolePermissions(prev => ({
          ...prev,
          [permissionId]: assignedRoleIds
        }));
      }
    } catch (error) {
      console.error('Failed to fetch role permissions:', error);
    }
  };

  const getAvailableRoles = (permissionId) => {
    const assignedRoleIds = rolePermissions[permissionId] || [];
    return roles.filter(role => !assignedRoleIds.includes(role.id));
  };

  const handleRoleAssignment = async (e) => {
    e.preventDefault();
    try {
      for (const roleId of selectedRoles) {
        await dispatch(assignPermissionToRole({
          roleId: parseInt(roleId),
          permissionId: selectedPermission.id
        })).unwrap();
      }
      showToast(`Permission assigned to ${selectedRoles.length} role(s) successfully!`, 'success');
      handleCloseAssignModal();
    } catch (error) {
      console.error('Failed to assign permission to roles:', error);
      showToast(error.message || 'Failed to assign permission to roles', 'error');
    }
  };

  const handleRemovePermissionFromRole = async (roleId, permissionId) => {
    if (window.confirm('Are you sure you want to remove this permission from the role?')) {
      try {
        const response = await fetch(`/api/roles/${roleId}/permissions/${permissionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          showToast('Permission removed from role successfully!', 'success');
          fetchRolePermissions(permissionId);
        } else {
          const errorData = await response.json();
          showToast(errorData.error || 'Failed to remove permission from role', 'error');
        }
      } catch (error) {
        console.error('Failed to remove permission from role:', error);
        showToast('Failed to remove permission from role', 'error');
      }
    }
  };

  const handleEdit = (permission) => {
    setEditingPermission(permission);
    setFormData({
      name: permission.name,
      action: permission.action,
      module_id: permission.module_id?.toString() || '',
      description: permission.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await dispatch(permissionsThunks.delete(permissionToDelete.id)).unwrap();
      showToast('Permission deleted successfully!', 'success');
      setShowDeleteModal(false);
      setPermissionToDelete(null);
    } catch (error) {
      console.error('Failed to delete permission:', error);
      showToast(error.message || 'Failed to delete permission', 'error');
      setShowDeleteModal(false);
      setPermissionToDelete(null);
    }
  };

  const handleShowDeleteModal = (permission) => {
    setPermissionToDelete(permission);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setPermissionToDelete(null);
  };

  const handleAssignToRoles = (permission) => {
    setSelectedPermission(permission);
    setSelectedRoles([]);
    setShowAssignModal(true);
    fetchRolePermissions(permission.id);
  };

  const handleRoleToggle = (roleId) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPermission(null);
    setFormData({ name: '', action: '', module_id: '', description: '' });
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedPermission(null);
    setSelectedRoles([]);
  };

  const handleAddNew = () => {
    setEditingPermission(null);
    setFormData({ name: '', action: '', module_id: '', description: '' });
    setShowModal(true);
  };

  const filteredPermissions = permissions.filter(permission => {
    const moduleMatch = !filterModule || permission.module_id?.toString() === filterModule;
    const actionMatch = !filterAction || permission.action === filterAction;
    return moduleMatch && actionMatch;
  });

  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const moduleName = modules.find(m => m.id === permission.module_id)?.name || 'Unknown Module';
    if (!acc[moduleName]) {
      acc[moduleName] = [];
    }
    acc[moduleName].push(permission);
    return acc;
  }, {});

  const actions = ['create', 'read', 'update', 'delete'];

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'update': return 'bg-yellow-100 text-yellow-800';
      case 'delete': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'create':
        return <PlusCircle className="w-4 h-4" />;
      case 'read':
        return <Eye className="w-4 h-4" />;
      case 'update':
        return <Edit3 className="w-4 h-4" />;
      case 'delete':
        return <Trash className="w-4 h-4" />;
      default:
        return <Key className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Permissions</h1>
          <p className="text-gray-600 mt-2">Manage system permissions and assign them to roles.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
        >
          <div className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add Permission
          </div>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 mr-2" />
            <div className="ml-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => dispatch(clearPermissionsError())}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="filterModule" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Module
            </label>
            <select
              id="filterModule"
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filterAction" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Action
            </label>
            <select
              id="filterAction"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterModule('');
                setFilterAction('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Permissions by Module */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading permissions...</span>
          </div>
        ) : Object.keys(groupedPermissions).length === 0 ? (
          <div className="text-center py-12">
            <KeyRound className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No permissions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterModule || filterAction ? 'Try adjusting your filters or create a new permission.' : 'Get started by creating a new permission.'}
            </p>
            <div className="mt-6">
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Permission
              </button>
            </div>
          </div>
        ) : (
          Object.entries(groupedPermissions).map(([moduleName, modulePermissions]) => (
            <div key={moduleName} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{moduleName}</h3>
                <p className="text-sm text-gray-500">{modulePermissions.length} permission(s)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {modulePermissions.map((permission) => (
                  <div key={permission.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(permission.action)}`}>
                          {getActionIcon(permission.action)}
                          <span className="ml-1">{permission.action}</span>
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(permission)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleShowDeleteModal(permission)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-medium text-gray-900 mb-2">{permission.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{permission.description || 'No description'}</p>

                    <button
                      onClick={() => handleAssignToRoles(permission)}
                      className="w-full flex items-center justify-center px-3 py-2 border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50 transition duration-200 text-sm"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Assign to Roles
                    </button>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">ID: {permission.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Permission Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingPermission ? 'Edit Permission' : 'Add New Permission'}
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
                    Permission Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., create_users"
                  />
                </div>

                <div>
                  <label htmlFor="action" className="block text-sm font-medium text-gray-700">
                    Action
                  </label>
                  <select
                    id="action"
                    name="action"
                    value={formData.action}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an action</option>
                    {actions.map((action) => (
                      <option key={action} value={action}>
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="module_id" className="block text-sm font-medium text-gray-700">
                    Module
                  </label>
                  <select
                    id="module_id"
                    name="module_id"
                    value={formData.module_id}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a module</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.name}
                      </option>
                    ))}
                  </select>
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
                    placeholder="Describe what this permission allows"
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
                    {editingPermission ? 'Update Permission' : 'Create Permission'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Roles Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Assign "{selectedPermission?.name}" to Roles
                </h3>
                <button
                  onClick={handleCloseAssignModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleRoleAssignment} className="space-y-4">
                {selectedPermission && rolePermissions[selectedPermission.id] && rolePermissions[selectedPermission.id].length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Already assigned to:</h4>
                    <div className="flex flex-wrap gap-2">
                      {rolePermissions[selectedPermission.id].map((roleId) => {
                        const role = roles.find(r => r.id === roleId);
                        return role ? (
                          <div
                            key={roleId}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          >
                            <span>{role.name}</span>
                            <button
                              onClick={() => handleRemovePermissionFromRole(roleId, selectedPermission.id)}
                              className="ml-2 text-green-600 hover:text-green-800"
                              title="Remove permission from role"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {selectedPermission && getAvailableRoles(selectedPermission.id).length === 0 ? (
                    <p className="text-gray-500 text-sm">No additional roles available - all roles already have this permission</p>
                  ) : (
                    selectedPermission && getAvailableRoles(selectedPermission.id).map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          value={role.id}
                          checked={selectedRoles.includes(role.id.toString())}
                          onChange={() => handleRoleToggle(role.id.toString())}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-medium text-gray-900">{role.name}</span>
                          {role.description && (
                            <p className="text-xs text-gray-500">{role.description}</p>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    {selectedRoles.length} role(s) selected
                  </p>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseAssignModal}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={selectedRoles.length === 0}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Assign to Roles
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && permissionToDelete && (
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
                  Delete Permission
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete permission <span className="font-semibold text-gray-700">"{permissionToDelete.name}"</span>? 
                  This action cannot be undone and will permanently remove the permission and all associated role assignments.
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
                    'Delete Permission'
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

export default Permissions;