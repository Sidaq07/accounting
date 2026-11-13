import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('rajindera_admin_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}
