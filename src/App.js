import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useSelector } from 'react-redux';

import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Roles from './pages/Roles';
import Modules from './pages/Modules';
import Permissions from './pages/Permissions';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector(state => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppLayout = ({ children }) => {
  const { isAuthenticated } = useSelector(state => state.auth);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && <Navbar />}
      <main className={isAuthenticated 
        ? "lg:ml-64 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8" 
        : ""
      }>
        {children}
      </main>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      } />
      <Route path="/groups" element={
        <ProtectedRoute>
          <Groups />
        </ProtectedRoute>
      } />
      <Route path="/roles" element={
        <ProtectedRoute>
          <Roles />
        </ProtectedRoute>
      } />
      <Route path="/modules" element={
        <ProtectedRoute>
          <Modules />
        </ProtectedRoute>
      } />
      <Route path="/permissions" element={
        <ProtectedRoute>
          <Permissions />
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
      </Router>
    </Provider>
  );
}

export default App;