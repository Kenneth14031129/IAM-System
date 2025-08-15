import { useSelector } from 'react-redux';
import { AlertCircle } from 'lucide-react';

const PermissionGuard = ({ module, action, children }) => {
  const { permissions } = useSelector(state => state.auth);
  
  const hasPermission = permissions.some(permission => 
    permission.module_name === module && permission.action === action
  );

  if (!hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-sm text-gray-500 mb-4">
            You don't have permission to access this page. 
          </p>
          <p className="text-xs text-gray-400">
            Required: {action} access on {module}
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default PermissionGuard;