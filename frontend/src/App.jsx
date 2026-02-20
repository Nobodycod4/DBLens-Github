import { Component } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react'; 
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Connections from './pages/Connections';
import SchemaViewer from './pages/SchemaViewer';
import QueryEditor from './pages/QueryEditor';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';
import Monitoring from './pages/Monitoring';
import Backups from './pages/Backups';
import SchemaDiagram from './pages/SchemaDiagram'; 
import { Toaster } from 'react-hot-toast';
import Schedules from './pages/Schedules';
import Migration from './pages/Migration';
import Snapshots from './pages/Snapshots';
import Login from './pages/Login';
import Setup from './pages/Setup.jsx';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import RoleManagement from './pages/RoleManagement';
import Documentation from './pages/Documentation';
import PerformanceAndHealth from './pages/PerformanceAndHealth';
import ConnectionPool from './pages/ConnectionPool';
import Teams from './pages/Teams';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Navigate } from 'react-router-dom';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-primary flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-600 text-center mb-6">
              The application encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-mono text-red-800 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Return to Dashboard
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reload Page
              </button>
            </div>

            <p className="mt-6 text-xs text-gray-500 text-center">
              If this problem persists, please contact support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <PermissionProvider>
              <Routes>
                {
}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/setup" element={<Setup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                
                {
}
                <Route path="/*" element={
                  <Layout>
                    <Routes>
                      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
                      <Route path="/schema" element={<ProtectedRoute><SchemaViewer /></ProtectedRoute>} />
                      <Route 
                        path="/schema-diagram" 
                        element={
                          <ProtectedRoute>
                            <ReactFlowProvider>
                              <SchemaDiagram />
                            </ReactFlowProvider>
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/query" element={<ProtectedRoute><QueryEditor /></ProtectedRoute>} />
                      <Route path="/monitoring" element={<ProtectedRoute><Monitoring /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
                      <Route path="/backups" element={<ProtectedRoute><Backups /></ProtectedRoute>} />
                      <Route path="/schedules" element={<ProtectedRoute><Schedules /></ProtectedRoute>} />
                      <Route path="/migration" element={<ProtectedRoute><Migration /></ProtectedRoute>} />
                      <Route path="/snapshots" element={<ProtectedRoute><Snapshots /></ProtectedRoute>} />
                      <Route path="/roles" element={<ProtectedRoute><RoleManagement /></ProtectedRoute>} />
                      <Route path="/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
                      <Route path="/performance" element={<ProtectedRoute><PerformanceAndHealth /></ProtectedRoute>} />
                      <Route path="/system-health" element={<Navigate to="/performance" replace />} />
                      <Route path="/connection-pool" element={<ProtectedRoute><ConnectionPool /></ProtectedRoute>} />
                      <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    </Routes>
                  </Layout>
                } />
              </Routes>
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
            />
            </PermissionProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
