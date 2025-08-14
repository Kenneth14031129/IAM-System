import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserPermissions, simulateAction } from '../store/store';
import { 
  Shield, 
  Grid3X3, 
  CheckCircle,
  Lock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

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
              <Shield className="w-6 h-6 text-blue-600" />
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
              <Grid3X3 className="w-6 h-6 text-green-600" />
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
              <CheckCircle className="w-6 h-6 text-purple-600" />
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
                <Lock className="mx-auto h-12 w-12 text-gray-400" />
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
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
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
    </div>
  );
};

export default Dashboard;