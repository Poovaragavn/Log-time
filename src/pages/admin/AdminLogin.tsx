import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, AlertCircle, ArrowUpRight, Eye, EyeOff, Sparkles, Activity, Shield } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(username, password, 'ADMIN');
      if (res.success) {
        window.location.hash = '#/admin/dashboard';
        window.dispatchEvent(new Event('hashchange'));
      } else {
        setError(res.message || 'Invalid Admin credentials');
      }
    } catch {
      setError('An error occurred during Admin login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pinterest-login-scene">
      {/* Background Animated Pulse Glow */}
      <div className="pinterest-bg-glow" />

      {/* Top 3D Sparkle Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px', zIndex: 10 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 50%, #06b6d4 100%)',
          color: '#ffffff',
          boxShadow: '0 12px 32px rgba(168, 85, 247, 0.4)',
          marginBottom: '14px'
        }}>
          <Sparkles size={30} />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
          LogTime Security System is ready to assist.
        </h1>
      </div>

      {/* Floating 3D Side Cards */}
      <div className="login-3d-side-card left" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 800, fontSize: '0.8rem' }}>
          <Activity size={18} /> System Audit
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
          Real-time 24/7 attendance logging & session security monitoring.
        </div>
      </div>

      <div className="login-3d-side-card right" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 800, fontSize: '0.8rem' }}>
          <Shield size={18} /> Role Governance
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
          Strict multi-role portal access with biometric verification.
        </div>
      </div>

      {/* Central 3D Glass Box with Multi-Color Shifting Input Cards */}
      <div className="pinterest-login-box admin-glow">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', color: '#f59e0b' }}>
          <ShieldCheck size={22} />
          <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ADMIN PORTAL
          </span>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.02em', marginBottom: '20px' }}>
          Admin Login
        </h2>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1.5px solid rgba(239, 68, 68, 0.4)',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontWeight: 700
          }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <input
              type="text"
              className="pinterest-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username / Email"
              required
              autoComplete="off"
            />
          </div>

            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="pinterest-input"
                style={{ paddingRight: '48px' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password (e.g. admin123)"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '18px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: showPassword ? '#f59e0b' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '16px',
              padding: '12px',
              fontSize: '0.78rem',
              color: '#d97706',
              textAlign: 'left'
            }}>
              <div style={{ fontWeight: 800, marginBottom: '8px' }}>
                ⚡ <strong>1-Click Instant Admin Login:</strong>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await login('admin@company.com', 'admin123', 'ADMIN');
                  if (res.success) {
                    window.location.hash = '#/admin/dashboard';
                    window.dispatchEvent(new Event('hashchange'));
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  width: '100%',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.35)'
                }}
              >
                🛡️ 1-Click Instant Login (Admin Portal)
              </button>
            </div>

          <button type="submit" className="pinterest-btn" disabled={loading}>
            <span>{loading ? 'AUTHENTICATING...' : 'Login to Admin Portal'}</span>
            <ArrowUpRight size={18} />
          </button>
        </form>

        {/* Portal Quick Switcher Links */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          <span style={{ color: '#94a3b8' }}>Switch Portal:</span>
          <a href="#/hr/login" style={{ color: '#ec4899', textDecoration: 'none' }}>HR Portal</a>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <a href="#/tl/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>Team Lead</a>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <a href="#/employee/login" style={{ color: '#10b981', textDecoration: 'none' }}>Employee</a>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <a href="#/" style={{ color: '#6366f1', textDecoration: 'none' }}>Home</a>
        </div>
      </div>
    </div>
  );
};
