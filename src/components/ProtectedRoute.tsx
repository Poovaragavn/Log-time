import React from 'react';
import { useAuth } from '../context/AuthContext';
import { type UserRole } from '../services/db';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { currentUser, isAuthenticated } = useAuth();

  if (!isAuthenticated || !currentUser) {
    const loginPaths: Record<UserRole, string> = {
      ADMIN: '/admin/login',
      HR: '/hr/login',
      TL: '/tl/login',
      EMPLOYEE: '/employee/login',
    };
    window.location.hash = loginPaths[allowedRole];
    return null;
  }

  if (currentUser.role !== allowedRole) {
    const dashboardPaths: Record<UserRole, string> = {
      ADMIN: '#/admin/dashboard',
      HR: '#/hr/dashboard',
      TL: '#/tl/dashboard',
      EMPLOYEE: '#/employee/dashboard',
    };
    
    return (
      <div className="app-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div className="elevated-panel-dark" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ color: '#ef4444', fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px' }}>Unauthorized Access</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
            You do not have permission to view this section. You are logged in as <strong>{currentUser.role}</strong>.
          </p>
          <a
            href={dashboardPaths[currentUser.role]}
            className="btn-glow"
            style={{ textDecoration: 'none' }}
          >
            Go to Your Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
