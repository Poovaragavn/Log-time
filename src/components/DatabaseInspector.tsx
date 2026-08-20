import React, { useState, useEffect, useRef } from 'react';
import { DB, type Employee } from '../services/db';
import { FaceEnrollmentModal } from './FaceEnrollmentModal';
import { Database, Download, Upload, RefreshCw, Search, Code, Table as TableIcon, CheckCircle, AlertTriangle, Edit3 } from 'lucide-react';

interface DatabaseInspectorProps {
  onClose?: () => void;
}

type TableKey = 'employees' | 'users' | 'workSessions' | 'attendance' | 'monitoringEvents' | 'auditLogs' | 'settings';

export const DatabaseInspector: React.FC<DatabaseInspectorProps> = () => {
  const [selectedTable, setSelectedTable] = useState<TableKey>('employees');
  const [dbData, setDbData] = useState<any>(DB.getAllRawData());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'TABLE' | 'JSON'>('TABLE');
  const [selectedEnrollEmp, setSelectedEnrollEmp] = useState<Employee | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshDb = () => {
    setDbData(DB.getAllRawData());
  };

  useEffect(() => {
    refreshDb();
    const interval = setInterval(refreshDb, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    DB.exportAllData();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        DB.importAllData(json);
        refreshDb();
        alert('Database imported successfully!');
      } catch (err) {
        alert('Failed to parse database JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the database to default sample data?')) {
      DB.resetAllData();
      refreshDb();
      alert('Database reset to initial sample data.');
    }
  };

  const currentRecords = Array.isArray(dbData[selectedTable]) ? dbData[selectedTable] : [dbData[selectedTable]];

  const filteredRecords = currentRecords.filter((rec: any) => {
    if (!searchQuery) return true;
    return JSON.stringify(rec).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStorageSizeKB = () => {
    const jsonStr = JSON.stringify(dbData);
    return (new Blob([jsonStr]).size / 1024).toFixed(2);
  };

  const tablesList: { key: TableKey; label: string; count: number }[] = [
    { key: 'employees', label: 'Employees', count: dbData.employees?.length || 0 },
    { key: 'users', label: 'Users', count: dbData.users?.length || 0 },
    { key: 'workSessions', label: 'Work Sessions', count: dbData.workSessions?.length || 0 },
    { key: 'attendance', label: 'Attendance', count: dbData.attendance?.length || 0 },
    { key: 'monitoringEvents', label: 'Monitoring Logs', count: dbData.monitoringEvents?.length || 0 },
    { key: 'auditLogs', label: 'Audit Logs', count: dbData.auditLogs?.length || 0 },
    { key: 'settings', label: 'Settings', count: 1 },
  ];

  return (
    <div style={{ width: '100%', color: '#0f172a' }}>
      {/* Top Database Header & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: '#4f46e5' }}>
              <Database size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>Database Inspector & Dataset Inspector</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Live inspector of localStorage records, facial descriptors & attendance database</p>
            </div>
          </div>
        </div>

        {/* Global DB Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={handleExport} className="btn-glow" style={{ padding: '8px 14px', fontSize: '0.8rem', gap: '6px' }}>
            <Download size={14} /> Export JSON DB
          </button>

          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem', gap: '6px' }}>
            <Upload size={14} /> Import JSON DB
          </button>

          <button onClick={handleReset} className="btn-danger" style={{ padding: '8px 14px', fontSize: '0.8rem', gap: '6px' }}>
            <RefreshCw size={14} /> Reset DB
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card-soft">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Database Size</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4f46e5' }}>{getStorageSizeKB()} KB</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>HTML5 LocalStorage</div>
        </div>

        <div className="card-soft">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Workforce</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>{dbData.employees?.length || 0}</div>
          <div style={{ fontSize: '0.72rem', color: '#10b981' }}>Active Records</div>
        </div>

        <div className="card-soft">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Enrolled Faces</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ec4899' }}>
            {dbData.employees?.filter((e: any) => e.faceEnrolled)?.length || 0} / {dbData.employees?.length || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#ec4899' }}>Biometric Profiles</div>
        </div>

        <div className="card-soft">
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Audit Events</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#3b82f6' }}>{dbData.auditLogs?.length || 0}</div>
          <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>Security Event Logs</div>
        </div>
      </div>

      {/* Table Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tablesList.map(t => (
          <button
            key={t.key}
            onClick={() => setSelectedTable(t.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              background: selectedTable === t.key ? 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)' : 'rgba(15, 23, 42, 0.06)',
              color: selectedTable === t.key ? '#ffffff' : '#475569',
              boxShadow: selectedTable === t.key ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {t.label} <span style={{ opacity: 0.8, fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.2)', padding: '2px 6px', borderRadius: '8px' }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Search & View Mode Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            placeholder={`Search ${selectedTable} database...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px', fontSize: '0.82rem' }}
          />
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.06)', padding: '3px', borderRadius: '10px' }}>
          <button
            onClick={() => setViewMode('TABLE')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'TABLE' ? '#ffffff' : 'transparent',
              color: viewMode === 'TABLE' ? '#0f172a' : '#64748b',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <TableIcon size={14} /> Table View
          </button>
          <button
            onClick={() => setViewMode('JSON')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'JSON' ? '#ffffff' : 'transparent',
              color: viewMode === 'JSON' ? '#0f172a' : '#64748b',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Code size={14} /> Raw JSON
          </button>
        </div>
      </div>

      {/* Main Database Content View */}
      {viewMode === 'TABLE' ? (
        <div className="data-table-container">
          {selectedTable === 'employees' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Enrolled Face Photo</th>
                  <th>Emp ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Department & Team</th>
                  <th>Biometric Face Enrolled</th>
                  <th>Enrolled At</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((emp: any) => (
                  <tr key={emp.id || emp.employeeId}>
                    <td>
                      <img
                        src={emp.faceImageUri || '/enrolled_face.jpg'}
                        alt={emp.fullName}
                        style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: emp.faceEnrolled ? '2px solid #10b981' : '2px solid #f59e0b' }}
                      />
                    </td>
                    <td style={{ fontWeight: 800 }}>{emp.employeeId}</td>
                    <td style={{ fontWeight: 800 }}>{emp.fullName}</td>
                    <td>{emp.email}</td>
                    <td>{emp.department} ({emp.team})</td>
                    <td>
                      {emp.faceEnrolled ? (
                        <span className="badge badge-active"><CheckCircle size={12} /> ENROLLED</span>
                      ) : (
                        <span className="badge badge-away"><AlertTriangle size={12} /> NOT ENROLLED</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.enrolledAt || 'N/A'}</td>
                    <td>
                      <button
                        onClick={() => setSelectedEnrollEmp(emp)}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.78rem', gap: '4px' }}
                      >
                        <Edit3 size={12} /> Edit Face & Storage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedTable === 'users' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Username / Email</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((usr: any) => (
                  <tr key={usr.id}>
                    <td>
                      <img
                        src={usr.avatar || '/enrolled_face.jpg'}
                        alt={usr.fullName}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    </td>
                    <td style={{ fontWeight: 800 }}>{usr.username}</td>
                    <td>{usr.fullName}</td>
                    <td><span className="badge badge-role">{usr.role}</span></td>
                    <td><span className="badge badge-active">{usr.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedTable !== 'employees' && selectedTable !== 'users' && (
            <div style={{ padding: '16px', overflowX: 'auto' }}>
              <pre style={{ background: '#090d16', color: '#38bdf8', padding: '16px', borderRadius: '14px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                {JSON.stringify(filteredRecords, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#090d16', padding: '20px', borderRadius: '16px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.82rem', maxHeight: '500px', overflowY: 'auto' }}>
          <pre>{JSON.stringify(filteredRecords, null, 2)}</pre>
        </div>
      )}

      {selectedEnrollEmp && (
        <FaceEnrollmentModal
          employee={selectedEnrollEmp}
          onClose={() => setSelectedEnrollEmp(null)}
          onSuccess={() => refreshDb()}
        />
      )}
    </div>
  );
};
