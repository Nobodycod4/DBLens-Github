import { Navigate } from 'react-router-dom';
import api from '../services/api';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = api.isAuthenticated();

  if (!isAuthenticated) {
    console.log('🚫 Not authenticated, redirecting to login...');
    return <Navigate to="/login" replace />;
  }

  return children;
}
