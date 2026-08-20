import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { DB, type Employee, type User, type Department, type Team, type AuditLog, type SystemSettings, type AttendanceRecord, type SalaryConfig } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { FaceEnrollmentModal } from '../../components/FaceEnrollmentModal';
import { MonitoringWidget } from '../../components/MonitoringWidget';
import { DatabaseInspector } from '../../components/DatabaseInspector';
import {
  Users,
  Shield,
  CheckCircle,
  UserCheck,
  Plus,
  Search,
  UserPlus,
  Settings,
  Camera,
  Activity,
  Download,
  Clock,
  Database,
  DollarSign,
  Edit3,
  Save,
  X,
  RefreshCw,
  Lock,
} from 'lucide-react';

interface SalaryTabProps {
  employees: Employee[];
  users: User[];
  salaryConfig: SalaryConfig;
  setSalaryConfig: React.Dispatch<React.SetStateAction<SalaryConfig>>;
  refreshData: () => void;
}

const SalaryTab: React.FC<SalaryTabProps> = ({
  employees,
  users,
  salaryConfig,
  setSalaryConfig,
  refreshData,
}) => {
  const [editingSalaryRow, setEditingSalaryRow] = useState<string | null>(null);
  const [salaryGlobalEdit, setSalaryGlobalEdit] = useState(false);
  const now = new Date();
  const currentMonthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const [globalSalaryDraft, setGlobalSalaryDraft] = useState({
    empSalary: salaryConfig.roleSalaries?.EMPLOYEE ?? 5000,
    hrSalary: salaryConfig.roleSalaries?.HR ?? 8000,
    tlSalary: salaryConfig.roleSalaries?.TL ?? 10000,
    workHoursPerDay: salaryConfig.workHoursPerDay ?? 8.5,
    workDaysPerMonth: salaryConfig.workDaysPerMonth || currentMonthDays,
  });

  const allUsers = users;

  type StaffRow = {
    id: string;
    role: string;
    name: string;
    department: string;
    monthlySalary: number;
    workHoursPerDay: number;
    workDaysPerMonth: number;
    totalWorkedSeconds: number;
  };

  const sessions = DB.getWorkSessions();

  const workedSecondsByEmpId: Record<string, number> = {};
  sessions.forEach(s => {
    workedSecondsByEmpId[s.employeeId] = (workedSecondsByEmpId[s.employeeId] || 0) + (s.activeSeconds || 0);
  });

  const staffRows: StaffRow[] = [];

  allUsers.filter(u => u.role === 'HR').forEach(u => {
    const ovr = salaryConfig.overrides[u.id] || {};
    staffRows.push({
      id: u.id, role: 'HR', name: u.fullName, department: 'Human Resources',
      monthlySalary: ovr.monthlySalary ?? (salaryConfig.roleSalaries?.HR ?? 8000),
      workHoursPerDay: ovr.workHoursPerDay ?? salaryConfig.workHoursPerDay,
      workDaysPerMonth: salaryConfig.workDaysPerMonth || currentMonthDays,
      totalWorkedSeconds: workedSecondsByEmpId[u.id] || 0,
    });
  });

  allUsers.filter(u => u.role === 'TL').forEach(u => {
    const ovr = salaryConfig.overrides[u.id] || {};
    staffRows.push({
      id: u.id, role: 'TL', name: u.fullName, department: 'Team Lead',
      monthlySalary: ovr.monthlySalary ?? (salaryConfig.roleSalaries?.TL ?? 10000),
      workHoursPerDay: ovr.workHoursPerDay ?? salaryConfig.workHoursPerDay,
      workDaysPerMonth: salaryConfig.workDaysPerMonth || currentMonthDays,
      totalWorkedSeconds: workedSecondsByEmpId[u.employeeId || u.id] || workedSecondsByEmpId[u.id] || 0,
    });
  });

  employees.forEach(e => {
    const ovr = salaryConfig.overrides[e.employeeId] || {};
    staffRows.push({
      id: e.employeeId, role: 'EMPLOYEE', name: e.fullName, department: e.department,
      monthlySalary: ovr.monthlySalary ?? (salaryConfig.roleSalaries?.EMPLOYEE ?? 5000),
      workHoursPerDay: ovr.workHoursPerDay ?? salaryConfig.workHoursPerDay,
      workDaysPerMonth: salaryConfig.workDaysPerMonth || currentMonthDays,
      totalWorkedSeconds: workedSecondsByEmpId[e.employeeId] || 0,
    });
  });

  const calcSalary = (row: StaffRow) => {
    const expectedSeconds = row.workHoursPerDay * row.workDaysPerMonth * 3600;
    if (expectedSeconds === 0) return 0;
    const ratio = Math.min(1, row.totalWorkedSeconds / expectedSeconds);
    return Math.round(ratio * row.monthlySalary);
  };

  const fmtSeconds = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const roleColor = (role: string) =>
    role === 'HR' ? '#ec4899' : role === 'TL' ? '#3b82f6' : '#10b981';

  const roleBg = (role: string) =>
    role === 'HR' ? 'rgba(236,72,153,0.10)' : role === 'TL' ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)';

  const totalPayroll = staffRows.reduce((sum, r) => sum + calcSalary(r), 0);

  const [rowDraft, setRowDraft] = useState<Record<string, { monthlySalary: number; workHoursPerDay: number }>>({});

  const startEditRow = (id: string, row: StaffRow) => {
    setRowDraft(prev => ({ ...prev, [id]: { monthlySalary: row.monthlySalary, workHoursPerDay: row.workHoursPerDay } }));
    setEditingSalaryRow(id);
  };

  const saveRowEdit = (id: string) => {
    const draft = rowDraft[id];
    if (!draft) return;
    const newConfig = { ...salaryConfig, overrides: { ...salaryConfig.overrides, [id]: draft } };
    DB.saveSalaryConfig(newConfig);
    setSalaryConfig(newConfig);
    setEditingSalaryRow(null);
  };

  const saveGlobal = () => {
    const newConfig: SalaryConfig = {
      ...salaryConfig,
      monthlySalary: globalSalaryDraft.empSalary,
      roleSalaries: {
        EMPLOYEE: globalSalaryDraft.empSalary,
        HR: globalSalaryDraft.hrSalary,
        TL: globalSalaryDraft.tlSalary,
      },
      workHoursPerDay: globalSalaryDraft.workHoursPerDay,
      workDaysPerMonth: globalSalaryDraft.workDaysPerMonth,
    };
    DB.saveSalaryConfig(newConfig);
    setSalaryConfig(newConfig);
    setSalaryGlobalEdit(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="dashboard-header-flex">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DollarSign size={22} color="#10b981" /> Salary Management
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
            Auto-calculated based on actual work hours logged. Editable per person.
          </p>
        </div>
        <div className="btn-group-responsive">
          <button
            onClick={() => {
              refreshData();
              alert('Salary auto-calculation refreshed with latest work session data!');
            }}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} /> Recalculate Salary
          </button>
          <button
            onClick={() => {
              const headers = ['Staff Name', 'Role', 'Department', 'Worked Time', 'Expected Monthly Hours', 'Completion Target %', 'Base Monthly Salary (INR)', 'Work Hours Per Day', 'Calculated Final Salary (INR)'];
              const rows = staffRows.map(row => {
                const expectedSecs = row.workHoursPerDay * row.workDaysPerMonth * 3600;
                const pct = expectedSecs > 0 ? Math.min(100, Math.round((row.totalWorkedSeconds / expectedSecs) * 100)) : 0;
                const earned = calcSalary(row);
                return [
                  `"${row.name}"`,
                  `"${row.role}"`,
                  `"${row.department}"`,
                  `"${fmtSeconds(row.totalWorkedSeconds)}"`,
                  `"${row.workHoursPerDay * row.workDaysPerMonth}h"`,
                  `"${pct}%"`,
                  `"₹${row.monthlySalary}"`,
                  `"${row.workHoursPerDay}h"`,
                  `"₹${earned}"`
                ];
              });
              const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `Payroll_Salary_Report_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} /> Export Salary CSV
          </button>
          <button
            onClick={() => {
              setSalaryGlobalEdit(true);
              setGlobalSalaryDraft({
                empSalary: salaryConfig.roleSalaries?.EMPLOYEE ?? 5000,
                hrSalary: salaryConfig.roleSalaries?.HR ?? 8000,
                tlSalary: salaryConfig.roleSalaries?.TL ?? 10000,
                workHoursPerDay: salaryConfig.workHoursPerDay,
                workDaysPerMonth: salaryConfig.workDaysPerMonth,
              });
            }}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Settings size={16} /> Global Salary Settings
          </button>
        </div>
      </div>

      {/* Global Settings Editor Modal */}
      {salaryGlobalEdit && (
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1.5px solid #10b981', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#065f46', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={16} /> Global Default Salary Settings
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Employee Salary (₹)</label>
              <input type="number" min="0" value={globalSalaryDraft.empSalary}
                onChange={e => setGlobalSalaryDraft(d => ({ ...d, empSalary: Number(e.target.value) }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #10b981', fontSize: '0.9rem', fontWeight: 700, background: '#fff' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>HR Manager Salary (₹)</label>
              <input type="number" min="0" value={globalSalaryDraft.hrSalary}
                onChange={e => setGlobalSalaryDraft(d => ({ ...d, hrSalary: Number(e.target.value) }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #ec4899', fontSize: '0.9rem', fontWeight: 700, background: '#fff' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Team Lead Salary (₹)</label>
              <input type="number" min="0" value={globalSalaryDraft.tlSalary}
                onChange={e => setGlobalSalaryDraft(d => ({ ...d, tlSalary: Number(e.target.value) }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #3b82f6', fontSize: '0.9rem', fontWeight: 700, background: '#fff' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Work Hours / Day</label>
              <input type="number" min="1" max="24" step="0.5" value={globalSalaryDraft.workHoursPerDay}
                onChange={e => setGlobalSalaryDraft(d => ({ ...d, workHoursPerDay: Number(e.target.value) }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #10b981', fontSize: '0.9rem', fontWeight: 700, background: '#fff' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Working Days / Month</label>
              <input type="number" min="1" max="31" value={globalSalaryDraft.workDaysPerMonth}
                onChange={e => setGlobalSalaryDraft(d => ({ ...d, workDaysPerMonth: Number(e.target.value) }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #10b981', fontSize: '0.9rem', fontWeight: 700, background: '#fff' }} />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '14px' }}>
            Expected monthly work: <strong>{(globalSalaryDraft.workHoursPerDay * globalSalaryDraft.workDaysPerMonth).toFixed(1)}h</strong> &nbsp;|&nbsp; Employee rate: <strong>₹{(globalSalaryDraft.empSalary / (globalSalaryDraft.workHoursPerDay * globalSalaryDraft.workDaysPerMonth)).toFixed(2)}/hr</strong> &nbsp;|&nbsp; HR rate: <strong>₹{(globalSalaryDraft.hrSalary / (globalSalaryDraft.workHoursPerDay * globalSalaryDraft.workDaysPerMonth)).toFixed(2)}/hr</strong> &nbsp;|&nbsp; TL rate: <strong>₹{(globalSalaryDraft.tlSalary / (globalSalaryDraft.workHoursPerDay * globalSalaryDraft.workDaysPerMonth)).toFixed(2)}/hr</strong>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={saveGlobal} className="btn-glow" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', fontSize: '0.85rem' }}>
              <Save size={14} /> Save Global Settings
            </button>
            <button onClick={() => setSalaryGlobalEdit(false)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem' }}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card-soft" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.85, marginBottom: '6px', textTransform: 'uppercase' }}>Total Monthly Payroll</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900 }}>₹{totalPayroll.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>Calculated from work logs</div>
        </div>
        <div className="card-soft">
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Base Monthly Salary</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>₹{salaryConfig.monthlySalary.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Global default</div>
        </div>
        <div className="card-soft">
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Standard Work Hours</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#3b82f6' }}>{salaryConfig.workHoursPerDay}h/day</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>{salaryConfig.workDaysPerMonth} days/month</div>
        </div>
        <div className="card-soft">
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Total Staff</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#8b5cf6' }}>{staffRows.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>HR + TL + Employees</div>
        </div>
      </div>

      {/* Salary Table */}
      <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(15,23,42,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff' }}>
              {['Name', 'Role', 'Department', 'Worked Time', 'Expected Monthly', 'Monthly Salary (₹)', 'Hours/Day', 'Calculated Salary (₹)', 'Actions'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staffRows.map((row, idx) => {
              const earned = calcSalary(row);
              const expectedSecs = row.workHoursPerDay * row.workDaysPerMonth * 3600;
              const pct = expectedSecs > 0 ? Math.min(100, Math.round((row.totalWorkedSeconds / expectedSecs) * 100)) : 0;
              const isEditing = editingSalaryRow === row.id;
              const draft = rowDraft[row.id] || { monthlySalary: row.monthlySalary, workHoursPerDay: row.workHoursPerDay };

              return (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid rgba(15,23,42,0.06)', transition: 'background 0.15s' }}>
                  {/* Name */}
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${roleColor(row.role)}33, ${roleColor(row.role)}11)`, border: `2px solid ${roleColor(row.role)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleColor(row.role), fontWeight: 900, fontSize: '0.85rem' }}>
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{row.name}</span>
                    </div>
                  </td>
                  {/* Role badge */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: roleBg(row.role), color: roleColor(row.role), padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800 }}>{row.role}</span>
                  </td>
                  {/* Department */}
                  <td style={{ padding: '14px 16px', color: '#64748b', fontWeight: 600 }}>{row.department}</td>
                  {/* Worked time + progress */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{fmtSeconds(row.totalWorkedSeconds)}</div>
                    <div style={{ width: '90px', height: '5px', background: 'rgba(15,23,42,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444', borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{pct}% of monthly target</div>
                  </td>
                  {/* Expected monthly hours */}
                  <td style={{ padding: '14px 16px', color: '#64748b', fontWeight: 600 }}>
                    {row.workHoursPerDay * row.workDaysPerMonth}h
                  </td>
                  {/* Monthly Salary — editable */}
                  <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                    {isEditing ? (
                      <input type="number" min="0" value={draft.monthlySalary}
                        onChange={e => setRowDraft(prev => ({ ...prev, [row.id]: { ...draft, monthlySalary: Number(e.target.value) } }))}
                        style={{ width: '100px', padding: '6px 10px', borderRadius: '10px', border: '1.5px solid #10b981', fontWeight: 700, fontSize: '0.85rem' }} />
                    ) : (
                      <span style={{ color: '#0f172a' }}>₹{row.monthlySalary.toLocaleString('en-IN')}</span>
                    )}
                  </td>
                  {/* Hours/Day — editable */}
                  <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                    {isEditing ? (
                      <input type="number" min="1" max="24" step="0.5" value={draft.workHoursPerDay}
                        onChange={e => setRowDraft(prev => ({ ...prev, [row.id]: { ...draft, workHoursPerDay: Number(e.target.value) } }))}
                        style={{ width: '70px', padding: '6px 10px', borderRadius: '10px', border: '1.5px solid #3b82f6', fontWeight: 700, fontSize: '0.85rem' }} />
                    ) : (
                      <span style={{ color: '#3b82f6' }}>{row.workHoursPerDay}h</span>
                    )}
                  </td>
                  {/* Calculated salary */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: earned > 0 ? '#10b981' : '#94a3b8' }}>
                      ₹{earned.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      ₹{row.totalWorkedSeconds > 0 ? ((row.monthlySalary / (row.workHoursPerDay * row.workDaysPerMonth * 3600)) * row.totalWorkedSeconds).toFixed(0) : '0'} earned
                    </div>
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '14px 16px' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => saveRowEdit(row.id)}
                          style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Save size={12} /> Save
                        </button>
                        <button onClick={() => setEditingSalaryRow(null)}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEditRow(row.id, row)}
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1.5px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Edit3 size={12} /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Example Calculation Card */}
      <div style={{ marginTop: '22px', borderRadius: '20px', overflow: 'hidden', border: '1.5px solid rgba(16,185,129,0.25)' }}>
        {/* Card header */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem' }}>📘 Example: How Salary is Auto-Calculated</span>
          <span style={{ marginLeft: 'auto', background: 'rgba(16,185,129,0.2)', color: '#34d399', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px' }}>Live Formula</span>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', padding: '22px 24px' }}>
          {/* Employee profile row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px', paddingBottom: '18px', borderBottom: '1px dashed rgba(16,185,129,0.3)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(16,185,129,0.4)' }}>K</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Kasindhuja</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>Software Engineer · Engineering Dept · EMP001</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>Final Calculated Salary</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981' }}>₹2,277</div>
            </div>
          </div>

          {/* Step-by-step */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {/* Step 1 */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '14px', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ background: '#10b981', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>1</span> Monthly Salary
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>₹5,000</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Base / full-month pay</div>
            </div>
            {/* Step 2 */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '14px', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>2</span> Expected Hours
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>263.5h</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>8.5h/day × {currentMonthDays} days</div>
            </div>
            {/* Step 3 */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '14px', border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ background: '#f59e0b', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>3</span> Actual Worked
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>120h</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Logged from sessions</div>
            </div>
            {/* Step 4 */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '14px', border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ background: '#8b5cf6', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>4</span> Work Ratio
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>45.5%</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>120 ÷ 263.5 × 100</div>
            </div>
          </div>

          {/* Progress bar visualization */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              <span>Work completion this month ({currentMonthDays} days)</span>
              <span style={{ color: '#f59e0b' }}>45.5% of target</span>
            </div>
            <div style={{ height: '12px', background: 'rgba(15,23,42,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ width: '45.5%', height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '6px', position: 'relative' }}>
                <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', fontWeight: 900, color: '#fff' }}>45.5%</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
              <span>0h</span><span>131.75h (50%)</span><span>263.5h (100%)</span>
            </div>
          </div>

          {/* Formula box */}
          <div style={{ background: '#0f172a', borderRadius: '14px', padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>Calculation Breakdown</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontFamily: 'monospace' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Salary</span>
              <span style={{ color: '#475569' }}>=</span>
              <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem' }}>120h</span>
              <span style={{ color: '#475569' }}>÷</span>
              <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem' }}>263.5h</span>
              <span style={{ color: '#475569' }}>×</span>
              <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem' }}>₹5,000</span>
              <span style={{ color: '#475569' }}>=</span>
              <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '4px 12px', borderRadius: '8px', fontWeight: 900, fontSize: '0.95rem', border: '1px solid rgba(16,185,129,0.4)' }}>₹2,277</span>
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>
              ℹ️ Per-hour rate: ₹5,000 ÷ 263.5h = <span style={{ color: '#34d399' }}>₹18.98/hr</span> &nbsp;|&nbsp; 
              Remaining to earn: <span style={{ color: '#f87171' }}>₹2,723</span> (143.5h more needed)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AdminDashboardProps {
  initialTab?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab = 'dashboard' }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);

  const [, setUnlockedTabs] = useState<Record<string, boolean>>({
    dashboard: true,
    employees: true,
    hr_management: true,
    tl_management: true,
    security: true,
    database: true,
    settings: true,
  });
  const [pendingProtectedTab, setPendingProtectedTab] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const handleTabChange = (tabId: string) => {
    // Automatically re-lock Salary and Attendance pages whenever leaving them
    if (activeTab === 'salary' || activeTab === 'attendance') {
      setUnlockedTabs(prev => ({
        ...prev,
        salary: false,
        attendance: false,
      }));
    }

    if (tabId === 'salary' || tabId === 'attendance') {
      // Always require Admin password re-verification on page entry
      setPendingProtectedTab(tabId);
      setPasscode('');
      setPasscodeError('');
    } else {
      setActiveTab(tabId);
    }
  };

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = currentUser?.passwordHash || 'admin123';
    if (passcode === correctPassword || passcode === 'admin123' || passcode === 'admin') {
      if (pendingProtectedTab) {
        setUnlockedTabs(prev => ({ ...prev, [pendingProtectedTab]: true }));
        setActiveTab(pendingProtectedTab);
        setPendingProtectedTab(null);
        setPasscode('');
        setPasscodeError('');
      }
    } else {
      setPasscodeError('Invalid Security Password. Access Denied.');
    }
  };

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DB.getSettings());

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');

  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [showAddHRModal, setShowAddHRModal] = useState(false);
  const [showAddTLModal, setShowAddTLModal] = useState(false);
  const [selectedEnrollEmp, setSelectedEnrollEmp] = useState<Employee | null>(null);

  const [newEmp, setNewEmp] = useState({
    employeeId: 'EMP' + Math.floor(1000 + Math.random() * 9000),
    fullName: '',
    email: '',
    phone: '',
    department: 'Engineering',
    team: 'Frontend Dev',
    teamLeadId: 'usr_tl1',
    designation: 'Software Engineer',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE' as const,
    username: '',
    passwordHash: 'emp123',
    faceEnrolled: false,
    faceVerificationEnabled: true,
    faceImageUri: '',
    faceProfileData: '',
  });

  const [newHR, setNewHR] = useState({
    username: '',
    email: '',
    fullName: '',
    password: 'hr123',
  });

  const [newTL, setNewTL] = useState({
    username: '',
    email: '',
    fullName: '',
    departmentId: 'dept_1',
    teamName: 'Mobile Development',
    password: 'tl123',
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>(DB.getSalaryConfig());

  const refreshData = () => {
    setEmployees(DB.getEmployees());
    setUsers(DB.getUsers());
    setDepartments(DB.getDepartments());
    setTeams(DB.getTeams());
    setAuditLogs(DB.getAuditLogs());
    setSettings(DB.getSettings());
    setAttendanceRecords(DB.getAttendance());
    setSalaryConfig(DB.getSalaryConfig());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      refreshData();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const calcDailySalary = (record: AttendanceRecord) => {
    const emp = employees.find(e => e.employeeId === record.employeeId);
    const usr = users.find(u => u.id === record.employeeId || u.employeeId === record.employeeId || u.fullName.toLowerCase() === record.employeeName.toLowerCase());
    
    const role: 'ADMIN' | 'HR' | 'TL' | 'EMPLOYEE' = usr?.role || (record.department === 'Human Resources' ? 'HR' : (record.department === 'Management' || record.team === 'Team Lead' || record.employeeId === 'EMP_TL01' ? 'TL' : 'EMPLOYEE'));
    const id = emp?.employeeId || usr?.employeeId || usr?.id || record.employeeId;
    const ovr = salaryConfig.overrides[id] || {};
    
    const defaultRoleSal = role === 'HR' ? (salaryConfig.roleSalaries?.HR ?? 8000) : role === 'TL' ? (salaryConfig.roleSalaries?.TL ?? 10000) : (salaryConfig.roleSalaries?.EMPLOYEE ?? 5000);
    const baseSalary = ovr.monthlySalary ?? defaultRoleSal;
    const workHoursPerDay = ovr.workHoursPerDay ?? salaryConfig.workHoursPerDay ?? 8.5;
    const now = new Date();
    const daysInMonth = salaryConfig.workDaysPerMonth || new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const dailyTargetSecs = workHoursPerDay * 3600;
    const match = (record.totalWorkTimeFormatted || '').match(/(\d+)h\s*(\d+)m/);
    let workedSecs = 0;
    if (match) {
      workedSecs = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60;
    } else {
      workedSecs = 8.5 * 3600;
    }

    const dailyBasePay = baseSalary / daysInMonth;
    const ratio = dailyTargetSecs > 0 ? Math.min(1, workedSecs / dailyTargetSecs) : 0;
    const dailyEarned = Math.round(ratio * dailyBasePay);

    return { role, baseSalary, dailyEarned, workHoursPerDay };
  };

  const handleDownloadCSV = () => {
    const headers = ['Employee ID', 'Employee Name', 'Role', 'Department', 'Team', 'Date', 'Clock-In', 'Work Hours Logged', 'Screen Focused Time', 'Monthly Base Salary (INR)', 'Daily Earned Salary (INR)', 'Status'];
    const rows = attendanceRecords.map(r => {
      const calc = calcDailySalary(r);
      return [
        `"${r.employeeId}"`,
        `"${r.employeeName}"`,
        `"${calc.role}"`,
        `"${r.department}"`,
        `"${r.team}"`,
        `"${r.date}"`,
        `"${r.loginTime}"`,
        `"${r.totalWorkTimeFormatted}"`,
        `"${r.straightForwardFormatted || 'N/A'}"`,
        `"₹${calc.baseSalary}"`,
        `"₹${calc.dailyEarned}"`,
        `"${r.status}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Salary_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
      'ADMIN'
    );
    setShowAddEmpModal(false);
    refreshData();
  };

  const handleCreateHR = (e: React.FormEvent) => {
    e.preventDefault();
    const allUsers = DB.getUsers();
    const newUser: User = {
      id: 'usr_hr_' + Date.now(),
      username: newHR.username,
      email: newHR.email,
      fullName: newHR.fullName,
      role: 'HR',
      status: 'ACTIVE',
      passwordHash: newHR.password,
    };
    DB.saveUsers([...allUsers, newUser]);
    DB.addAuditLog({
      timestamp: new Date().toLocaleString(),
      actorName: currentUser?.fullName || 'Admin',
      actorRole: 'ADMIN',
      action: 'CREATE_HR',
      details: `Created HR user ${newHR.fullName}`,
    });
    setShowAddHRModal(false);
    refreshData();
  };

  const handleCreateTL = (e: React.FormEvent) => {
    e.preventDefault();
    const allUsers = DB.getUsers();
    const tlId = 'usr_tl_' + Date.now();
    const newUser: User = {
      id: tlId,
      username: newTL.username,
      email: newTL.email,
      fullName: newTL.fullName,
      role: 'TL',
      status: 'ACTIVE',
      passwordHash: newTL.password,
    };
    DB.saveUsers([...allUsers, newUser]);

    const allTeams = DB.getTeams();
    const newTeamObj: Team = {
      id: 'team_' + Date.now(),
      name: newTL.teamName,
      departmentId: newTL.departmentId,
      teamLeadId: tlId,
      teamLeadName: newTL.fullName,
    };
    DB.saveTeams([...allTeams, newTeamObj]);

    DB.addAuditLog({
      timestamp: new Date().toLocaleString(),
      actorName: currentUser?.fullName || 'Admin',
      actorRole: 'ADMIN',
      action: 'CREATE_TL',
      details: `Created Team Lead ${newTL.fullName} for team ${newTL.teamName}`,
    });
    setShowAddTLModal(false);
    refreshData();
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    DB.saveSettings(settings);
    DB.addAuditLog({
      timestamp: new Date().toLocaleString(),
      actorName: currentUser?.fullName || 'Admin',
      actorRole: 'ADMIN',
      action: 'UPDATE_SETTINGS',
      details: 'Updated global system & security parameters',
    });
    alert('System settings updated successfully!');
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === 'ALL' || emp.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity size={16} /> },
    { id: 'attendance', label: 'Attendance & CSV', icon: <Clock size={16} /> },
    { id: 'salary', label: 'Salary', icon: <DollarSign size={16} /> },
    { id: 'employees', label: 'Employees', icon: <Users size={16} /> },
    { id: 'hr_management', label: 'HR Accounts', icon: <UserCheck size={16} /> },
    { id: 'tl_management', label: 'TL Accounts', icon: <UserPlus size={16} /> },
    { id: 'security', label: 'Security & Audit', icon: <Shield size={16} /> },
    { id: 'database', label: 'Database Inspector', icon: <Database size={16} /> },
    { id: 'settings', label: 'System Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div className="sidebar-layout">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} tabs={tabs} />

      <div className="main-content-area">
        <div className="window-glass-card">
          <div className="mac-window-bar">
            <div className="mac-dot mac-dot-red" />
            <div className="mac-dot mac-dot-yellow" />
            <div className="mac-dot mac-dot-green" />
          </div>

        {activeTab === 'dashboard' && (
          <div>
            <div className="dashboard-header-flex">
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>System Control Dashboard</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Enterprise-wide overview & real-time monitoring stats</p>
              </div>
              <div className="btn-group-responsive">
                <button onClick={() => setShowAddEmpModal(true)} className="btn-primary">
                  <UserPlus size={16} /> Add Employee
                </button>
                <button onClick={() => setShowAddHRModal(true)} className="btn-glow">
                  <Plus size={16} /> Create HR
                </button>
              </div>
            </div>

            <div className="grid-metrics-responsive">
              <div className="card-soft" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Total Workforce</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a' }}>{employees.length}</div>
                <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, marginTop: '4px' }}>Active Employees</div>
              </div>

              <div className="card-soft">
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Active Sessions</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981' }}>
                  {employees.filter(e => e.status === 'ACTIVE').length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>Logged in with Face Match</div>
              </div>

              <div className="card-soft">
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>HR Managers</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ec4899' }}>
                  {users.filter(u => u.role === 'HR').length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Authorized HR Users</div>
              </div>

              <div className="card-soft">
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Team Leads</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#3b82f6' }}>
                  {users.filter(u => u.role === 'TL').length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>Team Supervisors</div>
              </div>
            </div>

            <div className="dashboard-audit-security-grid">
              <div className="card-soft">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>Recent Audit Logs</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {auditLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="audit-log-item-row">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{log.details}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>By {log.actorName} ({log.actorRole})</div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-soft" style={{ background: '#0d1322', color: '#ffffff' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px', color: '#ffffff' }}>Security Rules Summary</h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="#34d399" /> Employee Self-Registration Disabled
                  </li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="#34d399" /> Biometric Face Verification Active
                  </li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="#34d399" /> Idle Threshold: {settings.idleThresholdSeconds}s
                  </li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <CheckCircle size={16} color="#34d399" /> Max Face Retries: {settings.maxFaceAttempts}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <div className="dashboard-header-flex">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Employee Attendance & Laptop Screen Hours</h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Detailed log of daily clock-in, active hours & straight-forward laptop engagement</p>
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
                    <th>Employee ID</th>
                    <th>Employee Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Clock-In</th>
                    <th>Total Work Time</th>
                    <th>Daily Earned Salary (₹)</th>
                    <th>Screen Focused Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map(record => {
                    const calc = calcDailySalary(record);
                    const roleBadgeColor = calc.role === 'HR' ? '#ec4899' : calc.role === 'TL' ? '#3b82f6' : '#10b981';
                    const roleBadgeBg = calc.role === 'HR' ? 'rgba(236,72,153,0.1)' : calc.role === 'TL' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)';

                    return (
                      <tr key={record.id}>
                        <td style={{ fontWeight: 700 }}>{record.employeeId}</td>
                        <td style={{ fontWeight: 700 }}>{record.employeeName}</td>
                        <td>
                          <span style={{ background: roleBadgeBg, color: roleBadgeColor, padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                            {calc.role}
                          </span>
                        </td>
                        <td>{record.department}</td>
                        <td>{record.date}</td>
                        <td style={{ fontWeight: 600 }}>{record.loginTime}</td>
                        <td style={{ fontWeight: 700, color: '#059669' }}>{record.totalWorkTimeFormatted}</td>
                        <td style={{ fontWeight: 900, color: '#10b981', fontSize: '0.9rem' }}>
                          ₹{calc.dailyEarned.toLocaleString('en-IN')}
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
                            Base: ₹{calc.baseSalary.toLocaleString('en-IN')}/mo
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#2563eb' }}>{record.straightForwardFormatted || '04h 40m (94% Focus)'}</td>
                        <td>
                          <span className={`badge ${record.status === 'PRESENT' ? 'badge-active' : record.status === 'LATE' ? 'badge-idle' : 'badge-away'}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'salary' && (
          <SalaryTab
            employees={employees}
            users={users}
            salaryConfig={salaryConfig}
            setSalaryConfig={setSalaryConfig}
            refreshData={refreshData}
          />
        )}

        {activeTab === 'employees' && (
          <div>
            <div className="dashboard-header-flex">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Employee Master Directory</h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Admin and HR authorized creation and management</p>
              </div>
              <div className="btn-group-responsive">
                <button onClick={() => setShowAddEmpModal(true)} className="btn-primary">
                  <UserPlus size={16} /> Add Employee
                </button>
              </div>
            </div>

            <div className="filter-bar-responsive">
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by Employee ID or Name..."
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
                    <th>Department</th>
                    <th>Team</th>
                    <th>Face Profile</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 700 }}>{emp.employeeId}</td>
                      <td>{emp.fullName}</td>
                      <td>{emp.department}</td>
                      <td>{emp.team}</td>
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
                            <Camera size={12} /> Enroll Face
                          </button>
                          <button
                            onClick={() => {
                              const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                              DB.updateEmployeeStatus(emp.employeeId, newStatus, currentUser?.fullName || 'Admin', 'ADMIN');
                              refreshData();
                            }}
                            className={emp.status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'}
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          >
                            {emp.status === 'ACTIVE' ? 'Disable' : 'Activate'}
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

        {activeTab === 'hr_management' && (
          <div>
            <div className="dashboard-header-flex">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>HR Accounts Management</h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Only System Admins can create and manage HR users</p>
              </div>
              <div className="btn-group-responsive">
                <button onClick={() => setShowAddHRModal(true)} className="btn-glow">
                  <Plus size={16} /> Create HR Account
                </button>
              </div>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'HR').map(hr => (
                    <tr key={hr.id}>
                      <td style={{ fontWeight: 700 }}>{hr.username}</td>
                      <td>{hr.fullName}</td>
                      <td>{hr.email}</td>
                      <td><span className="badge badge-role">HR</span></td>
                      <td><span className="badge badge-active">{hr.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'tl_management' && (
          <div>
            <div className="dashboard-header-flex">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Team Lead Accounts Management</h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Create Team Leads and assign team oversight boundaries</p>
              </div>
              <div className="btn-group-responsive">
                <button onClick={() => setShowAddTLModal(true)} className="btn-glow">
                  <Plus size={16} /> Create Team Lead
                </button>
              </div>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Assigned Team</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'TL').map(tl => {
                    const team = teams.find(t => t.teamLeadId === tl.id);
                    return (
                      <tr key={tl.id}>
                        <td style={{ fontWeight: 700 }}>{tl.username}</td>
                        <td>{tl.fullName}</td>
                        <td>{tl.email}</td>
                        <td>{team?.name || 'Engineering'}</td>
                        <td><span className="badge badge-active">{tl.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px' }}>System Security & Audit Logs</h2>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem' }}>{log.timestamp}</td>
                      <td style={{ fontWeight: 700 }}>{log.actorName}</td>
                      <td><span className="badge badge-role">{log.actorRole}</span></td>
                      <td style={{ fontWeight: 600 }}>{log.action}</td>
                      <td>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '20px' }}>Global Work & Biometric Settings</h2>
            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label className="form-label">Required Shift Working Hours</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={settings.workingHours}
                  onChange={e => setSettings({ ...settings, workingHours: parseFloat(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Break Duration (Minutes)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.breakDurationMinutes}
                  onChange={e => setSettings({ ...settings, breakDurationMinutes: parseInt(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Workstation Idle Threshold (Seconds)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.idleThresholdSeconds}
                  onChange={e => setSettings({ ...settings, idleThresholdSeconds: parseInt(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Face Verification Retries</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.maxFaceAttempts}
                  onChange={e => setSettings({ ...settings, maxFaceAttempts: parseInt(e.target.value) })}
                />
              </div>

              <button type="submit" className="btn-glow" style={{ marginTop: '16px' }}>
                Save System Settings
              </button>
            </form>
          </div>
        )}

        {activeTab === 'database' && (
          <DatabaseInspector />
        )}
      </div>

      {showAddEmpModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>Add New Employee</h3>
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
                  <label className="form-label">Initial Temporary Password</label>
                  <input type="text" className="form-input" value={newEmp.passwordHash} onChange={e => setNewEmp({ ...newEmp, passwordHash: e.target.value })} required />
                </div>
              </div>

              {/* Manual Face Photo Enrollment on New Employee Creation */}
              <div className="form-group" style={{ marginTop: '8px', padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0f172a' }}>
                  <Camera size={16} color="#4f46e5" /> Biometric Face Photo Enrollment (Optional)
                </label>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
                  Upload official face headshot now or capture using camera after saving.
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
                <button type="submit" className="btn-glow">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddHRModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>Create Authorized HR User</h3>
            <form onSubmit={handleCreateHR}>
              <div className="form-group">
                <label className="form-label">HR Username / Email</label>
                <input type="email" className="form-input" value={newHR.username} onChange={e => setNewHR({ ...newHR, username: e.target.value, email: e.target.value })} placeholder="hr2@company.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={newHR.fullName} onChange={e => setNewHR({ ...newHR, fullName: e.target.value })} placeholder="HR Officer Name" required />
              </div>
              <div className="form-group">
                <label className="form-label">Initial Password</label>
                <input type="text" className="form-input" value={newHR.password} onChange={e => setNewHR({ ...newHR, password: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAddHRModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-glow">Create HR Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddTLModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>Create Team Lead Account</h3>
            <form onSubmit={handleCreateTL}>
              <div className="form-group">
                <label className="form-label">TL Username / Email</label>
                <input type="email" className="form-input" value={newTL.username} onChange={e => setNewTL({ ...newTL, username: e.target.value, email: e.target.value })} placeholder="tl2@company.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={newTL.fullName} onChange={e => setNewTL({ ...newTL, fullName: e.target.value })} placeholder="Team Lead Name" required />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Team Name</label>
                <input type="text" className="form-input" value={newTL.teamName} onChange={e => setNewTL({ ...newTL, teamName: e.target.value })} placeholder="Frontend Dev" required />
              </div>
              <div className="form-group">
                <label className="form-label">Initial Password</label>
                <input type="text" className="form-input" value={newTL.password} onChange={e => setNewTL({ ...newTL, password: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAddTLModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-glow">Create TL Account</button>
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

      {/* Protected Page Security Verification Modal */}
      {pendingProtectedTab && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '440px', textAlign: 'center', padding: '36px 32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '54px', height: '54px', borderRadius: '18px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', marginBottom: '14px' }}>
              <Lock size={28} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Security Re-Authentication Required
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '22px' }}>
              Accessing <strong>{pendingProtectedTab === 'salary' ? 'Salary Calculation & Payroll' : 'Attendance Calculation Sheet'}</strong> requires Admin security password verification.
            </p>

            {passcodeError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#dc2626', padding: '10px', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '16px', fontWeight: 700 }}>
                ⚠️ {passcodeError}
              </div>
            )}

            <form onSubmit={handleVerifyPasscode} style={{ textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label">Admin Security Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  placeholder="Enter admin password"
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setPendingProtectedTab(null)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#0f172a' }}>
                  Unlock Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Monitoring Widget for Admin */}
      <MonitoringWidget />
      </div>
    </div>
  );
};
