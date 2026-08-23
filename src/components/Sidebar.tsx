import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Clock, Users, UserCheck, UserCog, LogOut, Menu, X } from 'lucide-react';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: { id: string; label: string; icon?: React.ReactNode }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, tabs = [] }) => {
  const { currentUser, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentHash = window.location.hash || '#/';

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="badge badge-role" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}><Shield size={12} /> ADMIN</span>;
      case 'HR':
        return <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)' }}><UserCog size={12} /> HR MANAGER</span>;
      case 'TL':
        return <span className="badge badge-role" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}><Users size={12} /> TEAM LEAD</span>;
      case 'EMPLOYEE':
        return <span className="badge badge-active"><UserCheck size={12} /> EMPLOYEE</span>;
      default:
        return null;
    }
  };

  const handleTabClick = (tabId: string) => {
    onTabChange?.(tabId);
    setMobileOpen(false); // Auto close mobile drawer on selection
  };

    const homeHref = currentUser ? `#/${currentUser.role.toLowerCase()}/dashboard` : '#/employee/login';

  return (
    <>
      {/* Mobile-Only Top Navigation Bar */}
      <div className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sidebar-brand-logo" style={{ width: '34px', height: '34px', borderRadius: '10px' }}>
            <Clock size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', lineHeight: 1.1 }}>
              Log Work Time
            </div>
            <div style={{ marginTop: '2px' }}>
              {currentUser && getRoleBadge(currentUser.role)}
            </div>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="mobile-menu-toggle-btn"
          aria-label="Toggle Navigation Menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside className={`sidebar-container ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar Brand Header (Desktop) */}
        <div className="sidebar-brand-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href={homeHref} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="sidebar-brand-logo">
                <Clock size={22} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: '1.15rem', color: '#0f172a' }}>
                  Log Work Time
                </div>
                <div style={{ marginTop: '4px' }}>
                  {currentUser && getRoleBadge(currentUser.role)}
                </div>
              </div>
            </a>
            {/* Close button inside drawer for mobile */}
            <button
              onClick={() => setMobileOpen(false)}
              className="mobile-drawer-close-btn"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Links List */}
        <nav className="sidebar-nav-list">
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 14px 10px 14px' }}>
            Navigation Menu
          </div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`sidebar-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{tab.icon}</span>
              <span className="sidebar-label">{tab.label}</span>
            </button>
          ))}

          {!currentUser && (
            <>
              <a href="#/employee/login" onClick={() => setMobileOpen(false)} className={`sidebar-nav-item ${currentHash.includes('/employee') || currentHash === '#/' || currentHash === '#' || !currentHash ? 'active' : ''}`}>
                <UserCheck size={18} />
                <span>Employee Portal</span>
              </a>
              <a href="#/admin/login" onClick={() => setMobileOpen(false)} className={`sidebar-nav-item ${currentHash.includes('/admin') ? 'active' : ''}`}>
                <Shield size={18} />
                <span>Admin Portal</span>
              </a>
              <a href="#/hr/login" onClick={() => setMobileOpen(false)} className={`sidebar-nav-item ${currentHash.includes('/hr') ? 'active' : ''}`}>
                <UserCog size={18} />
                <span>HR Portal</span>
              </a>
              <a href="#/tl/login" onClick={() => setMobileOpen(false)} className={`sidebar-nav-item ${currentHash.includes('/tl') ? 'active' : ''}`}>
                <Users size={18} />
                <span>Team Lead Portal</span>
              </a>
            </>
          )}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="sidebar-footer">
          {currentUser && (
            <div className="sidebar-user-card">
              <div className="sidebar-avatar">
                {currentUser.fullName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.fullName}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                  {currentUser.role}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentUser ? (
              <button onClick={() => { setMobileOpen(false); logout(); }} className="sidebar-logout-btn">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            ) : (
              <a href="#/employee/login" onClick={() => setMobileOpen(false)} className="sidebar-logout-btn" style={{ textDecoration: 'none' }}>
                <LogOut size={16} />
                <span>Sign In</span>
              </a>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
