import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { modulesThunks, clearModulesError } from '../store/store';
import { 
  Plus, 
  AlertCircle, 
  X, 
  Loader2, 
  Grid3X3, 
  Edit, 
  Trash2,
  Package
} from 'lucide-react';

const Modules = () => {
  const dispatch = useDispatch();
  const { items: modules, loading, error } = useSelector(state => state.modules);
  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  useEffect(() => {
    dispatch(modulesThunks.fetchAll());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearModulesError());
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
      if (editingModule) {
        await dispatch(modulesThunks.update({ 
          id: editingModule.id, 
          data: formData 
        })).unwrap();
        showToast('Module updated successfully!', 'success');
      } else {
        await dispatch(modulesThunks.create(formData)).unwrap();
        showToast('Module created successfully!', 'success');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save module:', error);
      showToast(error.message || 'Failed to save module', 'error');
    }
  };

  const handleEdit = (module) => {
    setEditingModule(module);
    setFormData({
      name: module.name,
      description: module.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await dispatch(modulesThunks.delete(moduleToDelete.id)).unwrap();
      showToast('Module deleted successfully!', 'success');
      setShowDeleteModal(false);
      setModuleToDelete(null);
    } catch (error) {
      console.error('Failed to delete module:', error);
      showToast(error.message || 'Failed to delete module', 'error');
      setShowDeleteModal(false);
      setModuleToDelete(null);
    }
  };

  const handleShowDeleteModal = (module) => {
    setModuleToDelete(module);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setModuleToDelete(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingModule(null);
    setFormData({ name: '', description: '' });
  };

  const handleAddNew = () => {
    setEditingModule(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Modules</h1>
          <p className="text-gray-600 mt-2">Manage system modules that define different business areas and functionality.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
        >
          <div className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add Module
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
              onClick={() => dispatch(clearModulesError())}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading modules...</span>
          </div>
        ) : modules.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No modules</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new module.</p>
            <div className="mt-6">
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Module
              </button>
            </div>
          </div>
        ) : (
          modules.map((module) => (
            <div key={module.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                    <Grid3X3 className='w-6 h-6' />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{module.name}</h3>
                    <p className="text-sm text-gray-500">ID: {module.id}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(module)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleShowDeleteModal(module)}
                    className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 min-h-[2.5rem]">
                {module.description || 'No description provided'}
              </p>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created: {module.created_at ? new Date(module.created_at).toLocaleDateString() : 'N/A'}</span>
                  <span className="px-2 py-1 bg-gray-100 rounded-full">Module</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Module Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingModule ? 'Edit Module' : 'Add New Module'}
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
                    Module Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter module name"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Examples: Reports, Analytics, Settings, etc.
                  </p>
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
                    placeholder="Enter module description"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Describe what this module controls or manages
                  </p>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        {editingModule ? 'Updating...' : 'Creating...'}
                      </div>
                    ) : (
                      editingModule ? 'Update Module' : 'Create Module'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && moduleToDelete && (
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
                  Delete Module
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete module <span className="font-semibold text-gray-700">"{moduleToDelete.name}"</span>? 
                  This action cannot be undone and will permanently remove the module and all associated permissions.
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
                    'Delete Module'
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

export default Modules;