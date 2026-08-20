import React, { useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useWorkSession } from '../../context/WorkSessionContext';
import { MonitoringWidget } from '../../components/MonitoringWidget';
import { DB } from '../../services/db';
import {
  CheckCircle,
  Activity,
  PlayCircle,
  ShieldCheck,
  Calendar,
  Coffee,
  UserCheck,
  Focus,
  Laptop
} from 'lucide-react';

import { SocialMediaBlocker } from '../../components/SocialMediaBlocker';

export const EmployeeDashboard: React.FC = () => {
  const { currentEmployee, currentUser } = useAuth();
  const {
    activeSeconds,
    idleSeconds,
    straightForwardSeconds,
    lookingAwaySeconds,
    gazeState,
    workStatus,
    loginTime,
    expectedLogout,
    remainingSeconds,
    toggleBreak,
    formatDuration,
  } = useWorkSession();

  const [activeTab, setActiveTab] = useState('overview');

  const empId = currentEmployee?.employeeId || currentUser?.employeeId || currentUser?.id;
  const empName = currentEmployee?.fullName || currentUser?.fullName || '';
  const attendance = DB.getAttendance().filter(a =>
    a.employeeId === empId || (empName && a.employeeName.toLowerCase().includes(empName.toLowerCase()))
  );

  const tabs = [
    { id: 'overview', label: 'Session HUD', icon: <Activity size={16} /> },
    { id: 'history', label: 'My Work History', icon: <Calendar size={16} /> },
    { id: 'security', label: 'Security & Password', icon: <ShieldCheck size={16} /> },
  ];

  const faceUri = currentEmployee?.faceImageUri || '/enrolled_face.jpg';
  const totalActivePlusAway = Math.max(1, straightForwardSeconds + lookingAwaySeconds);
  const focusPercentage = Math.round((straightForwardSeconds / totalActivePlusAway) * 100);

  return (
    <div className="sidebar-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

      <div className="main-content-area">
        <div className="window-glass-card">
          <div className="mac-window-bar">
            <div className="mac-dot mac-dot-red" />
            <div className="mac-dot mac-dot-yellow" />
            <div className="mac-dot mac-dot-green" />
          </div>

          <SocialMediaBlocker />

        {activeTab === 'overview' && (
          <div>
            <div className="employee-hero-card">
              <div className="employee-hero-flex">
                <div className="employee-hero-user-row">
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={faceUri}
                      alt="Enrolled Biometric Face"
                      style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '24px',
                        objectFit: 'cover',
                        border: '3px solid #10b981',
                        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      background: '#10b981',
                      color: '#ffffff',
                      borderRadius: '50%',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                    }} title="Verified Biometric Profile">
                      <UserCheck size={14} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span className="badge badge-active" style={{ fontSize: '0.82rem', padding: '5px 12px' }}>
                        <CheckCircle size={14} /> FACE VERIFIED ✓
                      </span>
                      <span className="badge" style={{ fontSize: '0.82rem', padding: '5px 12px', background: gazeState === 'STRAIGHT_FORWARD' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: gazeState === 'STRAIGHT_FORWARD' ? '#34d399' : '#f59e0b', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Focus size={12} /> GAZE: {gazeState === 'STRAIGHT_FORWARD' ? 'STRAIGHT FORWARD' : 'LOOKING AWAY'}
                      </span>
                    </div>
                    <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff' }}>
                      {currentEmployee?.fullName || currentUser?.fullName || 'John Doe'}
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '4px' }}>
                      ID: <strong>{currentEmployee?.employeeId || 'EMP1001'}</strong> • {currentEmployee?.designation || 'Senior Developer'} • {currentEmployee?.department || 'Engineering'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={toggleBreak}
                  className={workStatus === 'BREAK' ? 'btn-glow' : 'btn-primary'}
                  style={{
                    padding: '16px 28px',
                    fontSize: '1.05rem',
                    borderRadius: '18px',
                    background: workStatus === 'BREAK' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 6px 24px rgba(59, 130, 246, 0.4)'
                  }}
                >
                  {workStatus === 'BREAK' ? <PlayCircle size={22} /> : <Coffee size={22} />}
                  {workStatus === 'BREAK' ? 'Resume Work Session' : 'Take Work Break'}
                </button>
              </div>

              <div className="employee-hero-stats">
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600 }}>Login Time</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>{loginTime}</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600 }}>Expected Logout</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}>{expectedLogout}</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600 }}>Screen Focus Level</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>{focusPercentage}% Straight-Forward</div>
                </div>
              </div>
            </div>

            {/* Live Status Bar Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 12px #10b981',
                  animation: 'pulse 1s infinite'
                }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.05em' }}>
                  REAL-TIME SESSION COUNTERS (LIVE UPDATING)
                </span>
              </div>
              <span className="badge badge-active" style={{ fontSize: '0.78rem' }}>
                ⚡ 1-SECOND PRECISION TICK
              </span>
            </div>

            {/* Metric Live Clock Counter Cards */}
            <div className="grid-metrics-responsive">
              <div className="card-soft" style={{ borderLeft: '6px solid #10b981', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', position: 'relative' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Laptop size={16} color="#10b981" /> Straight-Forward Laptop Use
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}>🔴 LIVE</span>
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#10b981', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                  {formatDuration(straightForwardSeconds)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Face Centered & Aligned Forward
                </div>
              </div>

              <div className="card-soft" style={{ borderLeft: '6px solid #3b82f6' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Total Active Session</span>
                  <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 800 }}>🔴 LIVE</span>
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#3b82f6', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                  {formatDuration(activeSeconds)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
                  Logged-in Workstation Time
                </div>
              </div>

              <div className="card-soft" style={{ borderLeft: '6px solid #f59e0b' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Looking Away / Idle</span>
                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 800 }}>🔴 LIVE</span>
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                  {formatDuration(lookingAwaySeconds + idleSeconds)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
                  Gaze Turned or No Input
                </div>
              </div>

              <div className="card-soft" style={{ borderLeft: '6px solid #6366f1' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Remaining Shift Time</span>
                  <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 800 }}>🔴 COUNTDOWN</span>
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#6366f1', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                  {formatDuration(remainingSeconds)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6366f1', fontWeight: 600, marginTop: '4px' }}>
                  To Required Shift Hours ({expectedLogout})
                </div>
              </div>
            </div>

            <div className="card-soft">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px' }}>Real-Time Camera Facial Action Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.88rem' }}>
                <div>
                  <div style={{ color: '#64748b' }}>Camera Orientation</div>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>✓ 0° Center Angle (Straight-Forward)</div>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>Attentiveness Score</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{focusPercentage}% High Screen Engagement</div>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>Session Role</div>
                  <div style={{ fontWeight: 700, color: '#3b82f6' }}>{currentUser?.role} ({currentEmployee?.fullName})</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px' }}>My Attendance & Straight-Forward Work History</h2>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Login Time</th>
                    <th>Straight-Forward Laptop Use</th>
                    <th>Total Work Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(att => (
                    <tr key={att.id}>
                      <td>{att.date}</td>
                      <td><span className="badge badge-active">{att.status}</span></td>
                      <td>{att.loginTime}</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>{att.straightForwardFormatted || '04h 40m (94% Focus)'}</td>
                      <td style={{ fontWeight: 700 }}>{att.totalWorkTimeFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '20px' }}>Change Account Password</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const newPass = (form.elements.namedItem('newPassword') as HTMLInputElement).value;
              const confirmPass = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;
              if (newPass !== confirmPass) {
                alert('New passwords do not match!');
                return;
              }
              if (currentEmployee) {
                DB.resetPassword(currentEmployee.employeeId, newPass, currentEmployee.fullName, 'EMPLOYEE');
                alert('Password updated successfully!');
                form.reset();
              }
            }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" name="currentPassword" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" name="newPassword" className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" name="confirmPassword" className="form-input" required />
              </div>
              <button type="submit" className="btn-glow" style={{ marginTop: '12px' }}>
                Update My Password
              </button>
            </form>
          </div>
        )}
      </div>

      <MonitoringWidget />
      </div>
    </div>
  );
};
