import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { WorkSessionProvider } from './context/WorkSessionContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';

import { HRLogin } from './pages/hr/HRLogin';
import { HRDashboard } from './pages/hr/HRDashboard';

import { TLLogin } from './pages/tl/TLLogin';
import { TLDashboard } from './pages/tl/TLDashboard';

import { EmployeeLogin } from './pages/employee/EmployeeLogin';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
const RouterContent: React.FC = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '');
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const hashClean = currentHash.split('?')[0].replace(/\/$/, '');

  if (hashClean === '#/admin/login') return <AdminLogin />;
  if (hashClean.startsWith('#/admin/dashboard') || hashClean === '#/admin') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <AdminDashboard />
      </ProtectedRoute>
    );
  }
  if (hashClean.startsWith('#/admin/salary') || hashClean === '#/salary') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <AdminDashboard initialTab="salary" />
      </ProtectedRoute>
    );
  }
  if (hashClean.startsWith('#/admin/attendance') || hashClean === '#/attendance') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <AdminDashboard initialTab="attendance" />
      </ProtectedRoute>
    );
  }

  if (hashClean === '#/hr/login') return <HRLogin />;
  if (hashClean.startsWith('#/hr/dashboard') || hashClean === '#/hr') {
    return (
      <ProtectedRoute allowedRole="HR">
        <HRDashboard />
      </ProtectedRoute>
    );
  }

  if (hashClean === '#/tl/login') return <TLLogin />;
  if (hashClean.startsWith('#/tl/dashboard') || hashClean === '#/tl') {
    return (
      <ProtectedRoute allowedRole="TL">
        <TLDashboard />
      </ProtectedRoute>
    );
  }

  if (hashClean === '#/employee/login') return <EmployeeLogin />;
  if (hashClean.startsWith('#/employee/dashboard') || hashClean === '#/employee') {
    return (
      <ProtectedRoute allowedRole="EMPLOYEE">
        <EmployeeDashboard />
      </ProtectedRoute>
    );
  }

  return <EmployeeLogin />;
};

export function App() {
  return (
    <AuthProvider>
      <WorkSessionProvider>
        <RouterContent />
      </WorkSessionProvider>
    </AuthProvider>
  );
}

export default App;
