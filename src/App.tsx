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

import { Shield, UserCog, Users, UserCheck, Clock } from 'lucide-react';

const RouterContent: React.FC = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/employee/login');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/employee/login');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (currentHash === '#' || currentHash === '#/' || currentHash === '') {
    return (
      <div className="app-container" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <div className="elevated-panel" style={{ maxWidth: '800px', margin: '0 auto', background: '#0d1322', color: '#ffffff' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 8px 30px rgba(99, 102, 241, 0.5)'
          }}>
            <Clock size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '12px', color: '#ffffff' }}>
            LOG WORK TIME
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', marginBottom: '40px', maxWidth: '560px', margin: '0 auto 40px' }}>
            Enterprise Workstation & Biometric Face Verification Management System
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            <a href="#/admin/login" className="card-dark-soft" style={{ textDecoration: 'none', color: '#ffffff', textTransform: 'none' }}>
              <Shield size={28} color="#818cf8" style={{ marginBottom: '12px' }} />
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Admin Portal</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>System Control</div>
            </a>

            <a href="#/hr/login" className="card-dark-soft" style={{ textDecoration: 'none', color: '#ffffff', textTransform: 'none' }}>
              <UserCog size={28} color="#f472b6" style={{ marginBottom: '12px' }} />
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>HR Portal</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Employee & Attendance</div>
            </a>

            <a href="#/tl/login" className="card-dark-soft" style={{ textDecoration: 'none', color: '#ffffff', textTransform: 'none' }}>
              <Users size={28} color="#60a5fa" style={{ marginBottom: '12px' }} />
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Team Lead</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Team Monitoring</div>
            </a>

            <a href="#/employee/login" className="card-dark-soft" style={{ textDecoration: 'none', color: '#ffffff', textTransform: 'none' }}>
              <UserCheck size={28} color="#34d399" style={{ marginBottom: '12px' }} />
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Employee</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Face Login & Session</div>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (currentHash === '#/admin/login') return <AdminLogin />;
  if (currentHash === '#/admin/dashboard') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <AdminDashboard />
      </ProtectedRoute>
    );
  }
  if (currentHash === '#/admin/salary' || currentHash === '#/salary') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <AdminDashboard initialTab="salary" />
      </ProtectedRoute>
    );
  }
  if (currentHash === '#/admin/attendance' || currentHash === '#/attendance') {
    return (
      <ProtectedRoute allowedRole="ADMIN">
        <AdminDashboard initialTab="attendance" />
      </ProtectedRoute>
    );
  }

  if (currentHash === '#/hr/login') return <HRLogin />;
  if (currentHash === '#/hr/dashboard') {
    return (
      <ProtectedRoute allowedRole="HR">
        <HRDashboard />
      </ProtectedRoute>
    );
  }

  if (currentHash === '#/tl/login') return <TLLogin />;
  if (currentHash === '#/tl/dashboard') {
    return (
      <ProtectedRoute allowedRole="TL">
        <TLDashboard />
      </ProtectedRoute>
    );
  }

  if (currentHash === '#/employee/login') return <EmployeeLogin />;
  if (currentHash === '#/employee/dashboard') {
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
