import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Clock, Users, UserCheck, UserCog, ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: { id: string; label: string; icon?: React.ReactNode }[];
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, tabs = [] }) => {
  const { currentUser, logout } = useAuth();
  const currentHash = window.location.hash || '#/';

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="badge badge-role"><Shield size={12} /> ADMIN</span>;
      case 'HR':
        return <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.12)', color: '#db2777', border: '1px solid rgba(236, 72, 153, 0.3)' }}><UserCog size={12} /> HR</span>;
      case 'TL':
        return <span className="badge badge-role"><Users size={12} /> TEAM LEAD</span>;
      case 'EMPLOYEE':
        return <span className="badge badge-active"><UserCheck size={12} /> EMPLOYEE</span>;
      default:
        return null;
    }
  };

  return (
    <header className="pill-navbar">
      {/* Brand Logo Box linked to Home / Portal Switcher */}
      <a href="#/" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }} className="pill-nav-brand">
        <div className="pill-nav-brand-logo" title="Back to Portal Selector">
          <Clock size={20} color="#ffffff" />
        </div>
        <span style={{ fontWeight: 900, letterSpacing: '-0.03em', fontSize: '1.1rem' }}>Log Work Time</span>
        {currentUser && getRoleBadge(currentUser.role)}
      </a>

      {/* Pill Navigation Items */}
      <div className="pill-nav-items">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            className={`pill-nav-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span>
              {tab.label}
            </span>
          </button>
        ))}

        {!currentUser && (
          <>
            <a href="#/admin/login" className={`pill-nav-item ${currentHash.includes('/admin') ? 'active' : ''}`}>Admin</a>
            <a href="#/hr/login" className={`pill-nav-item ${currentHash.includes('/hr') ? 'active' : ''}`}>HR</a>
            <a href="#/tl/login" className={`pill-nav-item ${currentHash.includes('/tl') ? 'active' : ''}`}>Team Lead</a>
            <a href="#/employee/login" className={`pill-nav-item ${currentHash.includes('/employee') ? 'active' : ''}`}>Employee</a>
          </>
        )}
      </div>

      {/* Right-hand Action & Portal Switcher Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <a href="#/" className="pill-nav-item" style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '6px 12px' }} title="Switch Role / Home">
          Portals ⨁
        </a>
        {currentUser ? (
          <button onClick={logout} className="pill-logout-btn">
            <span>Logout</span>
            <ArrowUpRight size={16} />
          </button>
        ) : (
          <a href="#/employee/login" className="pill-logout-btn" style={{ textDecoration: 'none' }}>
            <span>Sign In</span>
            <ArrowUpRight size={16} />
          </a>
        )}
      </div>
    </header>
  );
};
