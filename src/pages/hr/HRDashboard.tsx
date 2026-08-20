import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { DB, type Employee, type AttendanceRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { FaceEnrollmentModal } from '../../components/FaceEnrollmentModal';
import { MonitoringWidget } from '../../components/MonitoringWidget';
import { DatabaseInspector } from '../../components/DatabaseInspector';
import {
  Users,
  Clock,
  CheckCircle,
  UserPlus,
  Search,
  Camera,
  KeyRound,
  FileText,
  Activity,
  Download,
  Database
} from 'lucide-react';

import { SocialMediaBlocker } from '../../components/SocialMediaBlocker';

export const HRDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');

  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [resetPassEmp, setResetPassEmp] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [selectedEnrollEmp, setSelectedEnrollEmp] = useState<Employee | null>(null);

  const [newEmp, setNewEmp] = useState({
    employeeId: 'EMP' + Math.floor(1000 + Math.random() * 9000),
    fullName: '',
    email: '',
    phone: '',
    department: 'Engineering',
    team: 'Frontend Dev',
    teamLeadId: 'usr_tl1',
    designation: 'Staff Analyst',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE' as const,
    username: '',
    passwordHash: 'emp123',
    faceEnrolled: false,
    faceVerificationEnabled: true,
    faceImageUri: '',
    faceProfileData: '',
  });

  const refreshData = () => {
    setEmployees(DB.getEmployees());
    setAttendance(DB.getAttendance());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      refreshData();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleDownloadCSV = () => {
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Team', 'Date', 'Clock-In', 'Work Hours', 'Screen Focused Time', 'Status'];
    const rows = attendance.map(r => [
      `"${r.employeeId}"`,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      `"${r.team}"`,
      `"${r.date}"`,
      `"${r.loginTime}"`,
      `"${r.totalWorkTimeFormatted}"`,
      `"${r.straightForwardFormatted || 'N/A'}"`,
      `"${r.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HR_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    DB.createEmployee(
      {
        ...newEmp,
        username: newEmp.username || newEmp.employeeId,
      },
      currentUser.fullName,
      'HR'
    );
    setShowAddEmpModal(false);
    refreshData();
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassEmp || !currentUser) return;
    DB.resetPassword(resetPassEmp.employeeId, newPassword, currentUser.fullName, 'HR');
    setResetPassEmp(null);
    setNewPassword('');
    alert(`Password for ${resetPassEmp.fullName} reset successfully!`);
    refreshData();
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === 'ALL' || emp.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity size={16} /> },
    { id: 'employees', label: 'Employee Directory', icon: <Users size={16} /> },
    { id: 'attendance', label: 'Attendance', icon: <Clock size={16} /> },
    { id: 'reports', label: 'Work Reports', icon: <FileText size={16} /> },
    { id: 'database', label: 'Database Inspector', icon: <Database size={16} /> },
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
            <div className="dashboard-header-flex">
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>HR Management Portal</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Employee onboarding, face profile verification & attendance</p>
              </div>
              <div className="btn-group-responsive">
                <button onClick={() => setShowAddEmpModal(true)} className="btn-glow" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}>
                  <UserPlus size={16} /> Add Employee
                </button>
              </div>
            </div>

            <div className="grid-metrics-responsive">
              <div className="card-soft">
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Total Workforce</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a' }}>{employees.length}</div>
                <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, marginTop: '4px' }}>Registered Accounts</div>
              </div>

              <div className="card-soft">
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Present Today</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981' }}>
                  {attendance.filter(a => a.status === 'PRESENT').length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>Verified Attendance</div>
              </div>

              <div className="card-soft">
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Late Logins</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f59e0b' }}>
                  {attendance.filter(a => a.status === 'LATE').length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, marginTop: '4px' }}>Logins After Shift Start</div>
              </div>

              <div className="card-soft">
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Face Enrolled</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ec4899' }}>
                  {employees.filter(e => e.faceEnrolled).length} / {employees.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#ec4899', fontWeight: 600, marginTop: '4px' }}>Biometrics Registered</div>
              </div>
            </div>

            <div className="card-soft">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>Employees Needing Face Enrollment</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {employees.filter(e => !e.faceEnrolled).map(emp => (
                  <div key={emp.id} className="hr-enroll-item-row">
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{emp.fullName} ({emp.employeeId})</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{emp.department} • {emp.designation}</div>
                    </div>
                    <button
                      onClick={() => setSelectedEnrollEmp(emp)}
                      className="btn-glow"
                      style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                    >
                      <Camera size={14} /> Enroll Face Now
                    </button>
                  </div>
                ))}

                {employees.filter(e => !e.faceEnrolled).length === 0 && (
                  <div style={{ padding: '20px', textTransform: 'none', color: '#10b981', fontWeight: 700, textAlign: 'center' }}>
                    ✓ All active employees have completed Face Profile Enrollment.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div>
            <div className="dashboard-header-flex">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>HR Employee Management</h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Create, update, enroll face biometrics and reset passwords</p>
              </div>
              <div className="btn-group-responsive">
                <button onClick={() => setShowAddEmpModal(true)} className="btn-glow" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}>
                  <UserPlus size={16} /> Add Employee
                </button>
              </div>
            </div>

            <div className="filter-bar-responsive">
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search employee by ID or name..."
                  style={{ paddingLeft: '40px' }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <select className="form-select" style={{ width: '200px' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="ALL">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Full Name</th>
                    <th>Dept & Team</th>
                    <th>Designation</th>
                    <th>Face Profile</th>
                    <th>Status</th>
                    <th>HR Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 700 }}>{emp.employeeId}</td>
                      <td>{emp.fullName}</td>
                      <td>{emp.department} ({emp.team})</td>
                      <td>{emp.designation}</td>
                      <td>
                        {emp.faceEnrolled ? (
                          <span className="badge badge-active"><CheckCircle size={12} /> ENROLLED</span>
                        ) : (
                          <span className="badge badge-away"><Camera size={12} /> NOT ENROLLED</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${emp.status === 'ACTIVE' ? 'badge-active' : 'badge-away'}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedEnrollEmp(emp)}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          >
                            <Camera size={12} /> Face Profile
                          </button>
                          <button
                            onClick={() => setResetPassEmp(emp)}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          >
                            <KeyRound size={12} /> Reset Password
                          </button>
                          <button
                            onClick={() => {
                              const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                              DB.updateEmployeeStatus(emp.employeeId, newStatus, currentUser?.fullName || 'HR', 'HR');
                              refreshData();
                            }}
                            className={emp.status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'}
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          >
                            {emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <div className="dashboard-header-flex">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Employee Attendance & Screen Focus Log</h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Daily attendance status, clock-in times & screen engagement stats</p>
              </div>
              <div className="btn-group-responsive">
                <button onClick={handleDownloadCSV} className="btn-glow" style={{ gap: '8px' }}>
                  <Download size={16} /> Download Attendance CSV 📥
                </button>
              </div>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Emp ID</th>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Clock-In Time</th>
                    <th>Status</th>
                    <th>Total Work Time</th>
                    <th>Screen Focused Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(att => (
                    <tr key={att.id}>
                      <td>{att.date}</td>
                      <td style={{ fontWeight: 700 }}>{att.employeeId}</td>
                      <td style={{ fontWeight: 700 }}>{att.employeeName}</td>
                      <td>{att.department}</td>
                      <td style={{ fontWeight: 600 }}>{att.loginTime}</td>
                      <td>
                        <span className={`badge ${att.status === 'PRESENT' ? 'badge-active' : att.status === 'LATE' ? 'badge-idle' : 'badge-away'}`}>
                          {att.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>{att.totalWorkTimeFormatted}</td>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>{att.straightForwardFormatted || '04h 40m (94% Focus)'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px' }}>HR Work-Time & Compliance Reports</h2>
            <div className="dashboard-audit-security-grid">
              <div className="card-soft">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>Export Employee Summary</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>Download full attendance and work time calculations for payroll.</p>
                <button onClick={() => alert('Exporting CSV Report...')} className="btn-primary">
                  Download Attendance CSV Report
                </button>
              </div>
              <div className="card-soft">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>Biometric Enrollment Status</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>Generate liveness compliance and face verification statistics.</p>
                <button onClick={() => alert('Generating Biometrics Compliance Report...')} className="btn-secondary">
                  Generate Compliance Report
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <DatabaseInspector />
        )}
      </div>

      {showAddEmpModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>Add New Employee (HR Portal)</h3>
            <form onSubmit={handleCreateEmployee}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input type="text" className="form-input" value={newEmp.employeeId} onChange={e => setNewEmp({ ...newEmp, employeeId: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" value={newEmp.fullName} onChange={e => setNewEmp({ ...newEmp, fullName: e.target.value })} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={newEmp.email} onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" className="form-input" value={newEmp.phone} onChange={e => setNewEmp({ ...newEmp, phone: e.target.value })} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={newEmp.department} onChange={e => setNewEmp({ ...newEmp, department: e.target.value })}>
                    <option value="Engineering">Engineering</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Team</label>
                  <input type="text" className="form-input" value={newEmp.team} onChange={e => setNewEmp({ ...newEmp, team: e.target.value })} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input type="text" className="form-input" value={newEmp.designation} onChange={e => setNewEmp({ ...newEmp, designation: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Password</label>
                  <input type="text" className="form-input" value={newEmp.passwordHash} onChange={e => setNewEmp({ ...newEmp, passwordHash: e.target.value })} required />
                </div>
              </div>

              {/* Manual Face Photo Enrollment on New Employee Creation */}
              <div className="form-group" style={{ marginTop: '8px', padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0f172a' }}>
                  <Camera size={16} color="#ec4899" /> Biometric Face Photo Enrollment (Optional)
                </label>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
                  Upload official face headshot now or capture using webcam after saving.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const uri = evt.target?.result as string;
                          setNewEmp(prev => ({
                            ...prev,
                            faceImageUri: uri,
                            faceEnrolled: true,
                            faceProfileData: `descriptor_new_${Date.now()}`
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ fontSize: '0.8rem' }}
                  />
                  {newEmp.faceImageUri && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={newEmp.faceImageUri}
                        alt="Preview"
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981' }}
                      />
                      <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>✓ FACE ATTACHED</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAddEmpModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-glow" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}>Create Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetPassEmp && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '12px' }}>
              Reset Password for {resetPassEmp.fullName}
            </h3>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setResetPassEmp(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEnrollEmp && (
        <FaceEnrollmentModal
          employee={selectedEnrollEmp}
          onClose={() => setSelectedEnrollEmp(null)}
          onSuccess={() => refreshData()}
        />
      )}

      {/* Live Monitoring Widget for HR */}
      <MonitoringWidget />
      </div>
    </div>
  );
};
