import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserPermissions, simulateAction } from '../store/store';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user, permissions } = useSelector(state => state.auth);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationForm, setSimulationForm] = useState({
    module: '',
    action: ''
  });

  useEffect(() => {
    // Fetch user permissions when dashboard loads
    dispatch(fetchUserPermissions());
  }, [dispatch]);

  const handleSimulation = async (e) => {
    e.preventDefault();
    try {
      const result = await dispatch(simulateAction(simulationForm)).unwrap();
      setSimulationResult({
        success: true,
        message: result.message || 'Action allowed',
        ...simulationForm
      });
    } catch (error) {
      setSimulationResult({
        success: false,
        message: error || 'Action denied',
        ...simulationForm
      });
    }
  };

  const handleInputChange = (e) => {
    setSimulationForm({
      ...simulationForm,
      [e.target.name]: e.target.value
    });
  };

  // Group permissions by module for better display
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const module = permission.module_name || permission.module;
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission.action);
    return acc;
  }, {});

  const modules = ['Users', 'Groups', 'Roles', 'Modules', 'Permissions'];
  const actions = ['create', 'read', 'update', 'delete'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, <span className="font-semibold">{user?.username}</span>!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Total Permissions</h3>
              <p className="text-2xl font-bold text-blue-600">{permissions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Accessible Modules</h3>
              <p className="text-2xl font-bold text-green-600">{Object.keys(groupedPermissions).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Account Status</h3>
              <p className="text-lg font-bold text-purple-600">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Permissions</h2>
          
          {Object.keys(groupedPermissions).length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-gray-500 mt-2">No permissions assigned</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([module, moduleActions]) => (
                <div key={module} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{module}</h3>
                  <div className="flex flex-wrap gap-2">
                    {moduleActions.map((action) => (
                      <span
                        key={action}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Permission Simulation */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Test Permissions</h2>
          <p className="text-gray-600 mb-4">
            Simulate an action to check if you have the required permissions.
          </p>

          <form onSubmit={handleSimulation} className="space-y-4">
            <div>
              <label htmlFor="module" className="block text-sm font-medium text-gray-700">
                Module
              </label>
              <select
                id="module"
                name="module"
                value={simulationForm.module}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a module</option>
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="action" className="block text-sm font-medium text-gray-700">
                Action
              </label>
              <select
                id="action"
                name="action"
                value={simulationForm.action}
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

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
            >
              Test Permission
            </button>
          </form>

          {/* Simulation Result */}
          {simulationResult && (
            <div className={`mt-4 p-4 rounded-md ${
              simulationResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${
                  simulationResult.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {simulationResult.success ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    simulationResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {simulationResult.success ? 'Permission Granted' : 'Permission Denied'}
                  </h3>
                  <p className={`text-sm ${
                    simulationResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    Action: <span className="font-medium">{simulationResult.action}</span> on{' '}
                    <span className="font-medium">{simulationResult.module}</span>
                  </p>
                  <p className={`text-xs mt-1 ${
                    simulationResult.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {simulationResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {modules.map((module) => (
            <button
              key={module}
              onClick={() => window.location.href = `/${module.toLowerCase()}`}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition duration-200"
            >
              <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              <span className="text-sm font-medium text-gray-900">Manage {module}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;