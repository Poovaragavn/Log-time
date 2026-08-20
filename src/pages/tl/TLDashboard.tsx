import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { DB, type Employee, type AttendanceRecord, type WorkSession } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { MonitoringWidget } from '../../components/MonitoringWidget';
import {
  Users,
  Clock,
  Activity,
  CheckCircle,
  FileText,
  Search
} from 'lucide-react';

import { SocialMediaBlocker } from '../../components/SocialMediaBlocker';

export const TLDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [teamEmployees, setTeamEmployees] = useState<Employee[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<AttendanceRecord[]>([]);
  const [teamSessions, setTeamSessions] = useState<WorkSession[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = () => {
    const allEmps = DB.getEmployees();
    const assignedEmps = allEmps.filter(e => e.team === 'Frontend Dev' || e.teamLeadId === currentUser?.id || e.teamLeadId === 'usr_tl1');
    setTeamEmployees(assignedEmps);

    const tlId = currentUser?.employeeId || currentUser?.id || 'EMP_TL01';
    const empIds = new Set(assignedEmps.map(e => e.employeeId));
    empIds.add(tlId);
    empIds.add('EMP_TL01');
    empIds.add('usr_tl1');

    const allAtt = DB.getAttendance().filter(a =>
      empIds.has(a.employeeId) ||
      a.employeeName.toLowerCase().includes('david vance') ||
      (currentUser?.fullName && a.employeeName.toLowerCase().includes(currentUser.fullName.toLowerCase()))
    );
    setTeamAttendance(allAtt);

    const allSess = DB.getWorkSessions().filter(s => empIds.has(s.employeeId) || s.employeeId === tlId);
    setTeamSessions(allSess);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      refreshData();
    }, 2000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const filteredEmployees = teamEmployees.filter(emp =>
    emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'dashboard', label: 'Team Dashboard', icon: <Activity size={16} /> },
    { id: 'my_team', label: 'My Team Members', icon: <Users size={16} /> },
    { id: 'attendance', label: 'Team Attendance', icon: <Clock size={16} /> },
    { id: 'reports', label: 'Team Reports', icon: <FileText size={16} /> },
  ];

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

        {activeTab === 'dashboard' && (
          <div>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                ASSIGNED TEAM: FRONTEND DEV
              </div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>Team Lead Oversight Portal</h1>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Real-time team work status, attendance & session analytics</p>
            </div>

            <div className="grid-metrics-responsive">
              <div className="card-soft">
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Team Members</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a' }}>{teamEmployees.length}</div>
                <div style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 600, marginTop: '4px' }}>Assigned Direct Reports</div>
              </div>

              <div className="card-soft">
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Active Now</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981' }}>
                  {teamEmployees.filter(e => e.status === 'ACTIVE').length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, marginTop: '4px' }}>Workstation Active</div>
              </div>

              <div className="card-soft">
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Idle Status</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f59e0b' }}>0</div>
                <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, marginTop: '4px' }}>No Activity Detected</div>
              </div>

              <div className="card-soft">
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>On Break</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#60a5fa' }}>0</div>
                <div style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 600, marginTop: '4px' }}>Official Break Time</div>
              </div>
            </div>

            <div className="card-soft">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>Team Live Status Monitor</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {teamEmployees.map(emp => {
                  const session = teamSessions.find(s => s.employeeId === emp.employeeId);
                  return (
                    <div key={emp.id} style={{ padding: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{emp.fullName}</div>
                        <span className="badge badge-active"><CheckCircle size={12} /> ACTIVE</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '8px' }}>
                        ID: <strong>{emp.employeeId}</strong> • {emp.designation}
                      </div>
                      <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px' }}>
                        <span>Login: <strong>{session?.loginTime || '09:15 AM'}</strong></span>
                        <span>Exp Logout: <strong>{session?.expectedLogout || '05:45 PM'}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'my_team' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Assigned Team Roster</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>View assigned employee profiles and status</p>
            </div>

            <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search team member..."
                style={{ paddingLeft: '40px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Full Name</th>
                    <th>Designation</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 700 }}>{emp.employeeId}</td>
                      <td>{emp.fullName}</td>
                      <td>{emp.designation}</td>
                      <td>{emp.email}</td>
                      <td><span className="badge badge-active">{emp.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px' }}>Team Attendance</h2>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Emp ID</th>
                    <th>Name</th>
                    <th>Login Time</th>
                    <th>Status</th>
                    <th>Total Work Time</th>
                  </tr>
                </thead>
                <tbody>
                  {teamAttendance.map(att => (
                    <tr key={att.id}>
                      <td>{att.date}</td>
                      <td style={{ fontWeight: 700 }}>{att.employeeId}</td>
                      <td>{att.employeeName}</td>
                      <td>{att.loginTime}</td>
                      <td><span className="badge badge-active">{att.status}</span></td>
                      <td style={{ fontWeight: 700 }}>{att.totalWorkTimeFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px' }}>Team Performance & Work Time Reports</h2>
            <div className="card-soft">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>Download Team Attendance</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>Generate team-level work hours and shift adherence reports.</p>
              <button onClick={() => alert('Exporting Team Attendance Summary...')} className="btn-primary">
                Export Team CSV Report
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Monitoring Widget for Team Leads */}
      <MonitoringWidget />
      </div>
    </div>
  );
};
