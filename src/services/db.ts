export type UserRole = 'ADMIN' | 'HR' | 'TL' | 'EMPLOYEE';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type WorkStatus = 'ACTIVE' | 'IDLE' | 'AWAY' | 'BREAK' | 'LOCKED' | 'OFFLINE';
export type EventType = 'FACE_PRESENT' | 'FACE_ABSENT' | 'FACE_REAPPEARED' | 'MULTIPLE_FACES' | 'LIVENESS_FAILED';
export type FaceGazeState = 'STRAIGHT_FORWARD' | 'LOOKING_LEFT' | 'LOOKING_RIGHT' | 'FACE_ABSENT';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  employeeId?: string;
  fullName: string;
  status: AccountStatus;
  passwordHash: string;
  avatar?: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  team: string;
  teamLeadId: string;
  designation: string;
  joiningDate: string;
  status: AccountStatus;
  username: string;
  passwordHash: string;
  faceEnrolled: boolean;
  faceVerificationEnabled: boolean;
  faceProfileData?: string;
  faceImageUri?: string;
  enrolledAt?: string;
  gender?: 'male' | 'female';
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headName: string;
}

export interface Team {
  id: string;
  name: string;
  departmentId: string;
  teamLeadId: string;
  teamLeadName: string;
}

export interface WorkSession {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  loginTime: string;
  logoutTime?: string;
  activeSeconds: number;
  idleSeconds: number;
  breakSeconds: number;
  awaySeconds: number;
  straightForwardSeconds: number; // Straight-forward laptop screen engagement time
  lookingAwaySeconds: number;
  expectedLogout: string;
  status: WorkStatus;
}

export interface MonitoringEvent {
  id: string;
  employeeId: string;
  employeeName: string;
  eventType: EventType;
  timestamp: string;
  details?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  team: string;
  date: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  loginTime: string;
  logoutTime?: string;
  totalWorkTimeFormatted: string;
  straightForwardFormatted?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  details: string;
}

export interface SystemSettings {
  workingHours: number;
  breakDurationMinutes: number;
  idleThresholdSeconds: number;
  maxFaceAttempts: number;
  strictFaceMode: boolean;
  cameraMonitoringEnabled: boolean;
}

export interface SalaryConfig {
  /** Monthly base salary for employees (default 5000) */
  monthlySalary: number;
  /** Role-based default base monthly salaries */
  roleSalaries: {
    EMPLOYEE: number;
    HR: number;
    TL: number;
  };
  /** Standard working hours per day (default 8.5) */
  workHoursPerDay: number;
  /** Working days per month (default total days of current month, e.g. 31) */
  workDaysPerMonth: number;
  /** Per-employee overrides: key = employeeId */
  overrides: Record<string, { monthlySalary?: number; workHoursPerDay?: number }>;
}

const STORAGE_KEYS = {
  USERS: 'logtime_users',
  EMPLOYEES: 'logtime_employees',
  DEPARTMENTS: 'logtime_departments',
  TEAMS: 'logtime_teams',
  WORK_SESSIONS: 'logtime_work_sessions',
  MONITORING_EVENTS: 'logtime_monitoring_events',
  ATTENDANCE: 'logtime_attendance',
  AUDIT_LOGS: 'logtime_audit_logs',
  SETTINGS: 'logtime_settings',
  SALARY_CONFIG: 'logtime_salary_config',
};

const defaultSettings: SystemSettings = {
  workingHours: 8.5,
  breakDurationMinutes: 45,
  idleThresholdSeconds: 300,
  maxFaceAttempts: 3,
  strictFaceMode: true,
  cameraMonitoringEnabled: true,
};

const defaultUsers: User[] = [
  {
    id: 'usr_admin',
    username: 'admin@company.com',
    email: 'admin@company.com',
    fullName: 'System Administrator',
    role: 'ADMIN',
    status: 'ACTIVE',
    passwordHash: 'admin123',
  },
  {
    id: 'usr_hr',
    username: 'hr@company.com',
    email: 'hr@company.com',
    fullName: 'Sarah Jenkins (HR Manager)',
    role: 'HR',
    status: 'ACTIVE',
    passwordHash: 'hr123',
  },
  {
    id: 'usr_tl1',
    username: 'tl@company.com',
    email: 'tl@company.com',
    fullName: 'David Vance (Engineering TL)',
    role: 'TL',
    employeeId: 'EMP_TL01',
    status: 'ACTIVE',
    passwordHash: 'tl123',
  },
  {
    id: 'usr_emp1',
    username: 'kasindhuja750@gmail.com',
    email: 'kasindhuja750@gmail.com',
    fullName: 'Kasindhuja',
    role: 'EMPLOYEE',
    employeeId: 'EMP001',
    status: 'ACTIVE',
    passwordHash: 'emp123',
    avatar: '/kasindhuja_face.jpg',
  },
  {
    id: 'usr_emp2',
    username: 'poovaragavan450@gmail.com',
    email: 'poovaragavan450@gmail.com',
    fullName: 'Poovaragavan',
    role: 'EMPLOYEE',
    employeeId: 'EMP002',
    status: 'ACTIVE',
    passwordHash: 'emp123',
    avatar: '/poovaragavan_face.jpg',
  },
  {
    id: 'usr_emp3',
    username: 'kowsikavelmurugan60@gmail.com',
    email: 'kowsikavelmurugan60@gmail.com',
    fullName: 'Kowsika Velmurugan',
    role: 'EMPLOYEE',
    employeeId: 'EMP003',
    status: 'ACTIVE',
    passwordHash: 'emp123',
    avatar: '/kowsika_face.jpg',
  }
];

const defaultEmployees: Employee[] = [
  {
    id: 'emp_1',
    employeeId: 'EMP001',
    fullName: 'Kasindhuja',
    email: 'kasindhuja750@gmail.com',
    phone: '+91 98765-43210',
    department: 'Engineering',
    team: 'Frontend Dev',
    teamLeadId: 'usr_tl1',
    designation: 'Software Engineer',
    joiningDate: '2024-01-10',
    status: 'ACTIVE',
    username: 'kasindhuja750@gmail.com',
    passwordHash: 'emp123',
    faceEnrolled: true,
    faceVerificationEnabled: true,
    faceImageUri: '/kasindhuja_face.jpg',
    enrolledAt: '2026-08-19 10:00:00',
    gender: 'female'
  },
  {
    id: 'emp_2',
    employeeId: 'EMP002',
    fullName: 'Poovaragavan',
    email: 'poovaragavan450@gmail.com',
    phone: '+91 98765-43211',
    department: 'Engineering',
    team: 'Frontend Dev',
    teamLeadId: 'usr_tl1',
    designation: 'Software Engineer',
    joiningDate: '2024-01-12',
    status: 'ACTIVE',
    username: 'poovaragavan450@gmail.com',
    passwordHash: 'emp123',
    faceEnrolled: true,
    faceVerificationEnabled: true,
    faceImageUri: '/poovaragavan_face.jpg',
    enrolledAt: '2026-08-19 10:00:00',
    gender: 'male'
  },
  {
    id: 'emp_3',
    employeeId: 'EMP003',
    fullName: 'Kowsika Velmurugan',
    email: 'kowsikavelmurugan60@gmail.com',
    phone: '+91 98765-43212',
    department: 'Engineering',
    team: 'Frontend Dev',
    teamLeadId: 'usr_tl1',
    designation: 'Software Engineer',
    joiningDate: '2024-02-01',
    status: 'ACTIVE',
    username: 'kowsikavelmurugan60@gmail.com',
    passwordHash: 'emp123',
    faceEnrolled: true,
    faceVerificationEnabled: true,
    faceImageUri: '/kowsika_face.jpg',
    enrolledAt: '2026-08-19 12:00:00',
    gender: 'female'
  }
];

const defaultDepartments: Department[] = [
  { id: 'dept_1', name: 'Engineering', code: 'ENG', headName: 'Michael Scott' },
  { id: 'dept_2', name: 'Human Resources', code: 'HR', headName: 'Sarah Jenkins' },
  { id: 'dept_3', name: 'Marketing', code: 'MKT', headName: 'Pam Beesly' },
];

const defaultTeams: Team[] = [
  { id: 'team_1', name: 'Frontend Dev', departmentId: 'dept_1', teamLeadId: 'usr_tl1', teamLeadName: 'David Vance' },
  { id: 'team_2', name: 'Backend Infrastructure', departmentId: 'dept_1', teamLeadId: 'usr_tl1', teamLeadName: 'David Vance' },
  { id: 'team_3', name: 'Content Operations', departmentId: 'dept_3', teamLeadId: 'usr_tl1', teamLeadName: 'David Vance' },
];

const defaultWorkSessions: WorkSession[] = [
  {
    id: 'ws_1',
    employeeId: 'EMP001',
    employeeName: 'Kasindhuja',
    date: new Date().toISOString().split('T')[0],
    loginTime: '09:00 AM',
    activeSeconds: 17538,
    idleSeconds: 500,
    breakSeconds: 1902,
    awaySeconds: 240,
    straightForwardSeconds: 16800, // ~4h 40m straight-forward laptop screen engagement
    lookingAwaySeconds: 738,
    expectedLogout: '05:30 PM',
    status: 'ACTIVE',
  },
  {
    id: 'ws_2',
    employeeId: 'EMP002',
    employeeName: 'Poovaragavan',
    date: new Date().toISOString().split('T')[0],
    loginTime: '09:05 AM',
    activeSeconds: 18420,
    idleSeconds: 420,
    breakSeconds: 1200,
    awaySeconds: 180,
    straightForwardSeconds: 17460,
    lookingAwaySeconds: 960,
    expectedLogout: '05:35 PM',
    status: 'ACTIVE',
  },
  {
    id: 'ws_3',
    employeeId: 'EMP003',
    employeeName: 'Kowsika Velmurugan',
    date: new Date().toISOString().split('T')[0],
    loginTime: '09:10 AM',
    activeSeconds: 18000,
    idleSeconds: 300,
    breakSeconds: 1500,
    awaySeconds: 120,
    straightForwardSeconds: 17100,
    lookingAwaySeconds: 900,
    expectedLogout: '05:40 PM',
    status: 'ACTIVE',
  }
];

const defaultAttendance: AttendanceRecord[] = [
  {
    id: 'att_1',
    employeeId: 'EMP001',
    employeeName: 'Kasindhuja',
    department: 'Engineering',
    team: 'Frontend Dev',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    loginTime: '09:00 AM',
    totalWorkTimeFormatted: '05h 15m',
    straightForwardFormatted: '04h 55m (96% Focus)'
  },
  {
    id: 'att_tl',
    employeeId: 'EMP_TL01',
    employeeName: 'David Vance (Engineering TL)',
    department: 'Management',
    team: 'Team Lead',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    loginTime: '09:00 AM',
    totalWorkTimeFormatted: '05h 30m',
    straightForwardFormatted: '05h 10m (94% Focus)'
  },
  {
    id: 'att_hr',
    employeeId: 'EMP_HR01',
    employeeName: 'Sarah Jenkins (HR Manager)',
    department: 'Human Resources',
    team: 'HR Team',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    loginTime: '09:00 AM',
    totalWorkTimeFormatted: '05h 30m',
    straightForwardFormatted: '05h 15m (95% Focus)'
  },
  {
    id: 'att_2',
    employeeId: 'EMP002',
    employeeName: 'Poovaragavan',
    department: 'Engineering',
    team: 'Frontend Dev',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    loginTime: '09:05 AM',
    totalWorkTimeFormatted: '05h 10m',
    straightForwardFormatted: '04h 50m (94% Focus)'
  },
  {
    id: 'att_3',
    employeeId: 'EMP003',
    employeeName: 'Kowsika Velmurugan',
    department: 'Engineering',
    team: 'Frontend Dev',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    loginTime: '09:10 AM',
    totalWorkTimeFormatted: '05h 05m',
    straightForwardFormatted: '04h 45m (93% Focus)'
  }
];

const defaultAuditLogs: AuditLog[] = [
  {
    id: 'log_1',
    timestamp: new Date().toLocaleString(),
    actorName: 'Sarah Jenkins',
    actorRole: 'HR',
    action: 'ENROLL_FACE',
    details: 'Enrolled official biometric face profile photo for employee EMP1001 (John Doe)',
  }
];

function getItem<T>(key: string, defaultVal: T): T {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaultVal;
  }
}

function setItem<T>(key: string, val: T): void {
  localStorage.setItem(key, JSON.stringify(val));
}

export const DB = {
  getUsers: (): User[] => {
    const stored = getItem(STORAGE_KEYS.USERS, defaultUsers);
    const clean = stored.filter(u => !['EMP1001', 'EMP1002', 'EMP1003', 'EMP1004', 'EMP1005', 'EMP1006'].includes(u.employeeId || u.username));
    defaultUsers.forEach(d => {
      if (!clean.some(u => u.username.toLowerCase() === d.username.toLowerCase() || u.email?.toLowerCase() === d.email?.toLowerCase())) {
        clean.push(d);
      }
    });
    return clean;
  },
  saveUsers: (users: User[]) => setItem(STORAGE_KEYS.USERS, users),

  getEmployees: (): Employee[] => {
    const stored = getItem(STORAGE_KEYS.EMPLOYEES, defaultEmployees);
    const clean = stored.filter(e => !['EMP1001', 'EMP1002', 'EMP1003', 'EMP1004', 'EMP1005', 'EMP1006'].includes(e.employeeId || e.username));
    defaultEmployees.forEach(d => {
      if (!clean.some(e => e.employeeId === d.employeeId || e.email.toLowerCase() === d.email.toLowerCase())) {
        clean.push(d);
      }
    });
    return clean.map(e => {
      if (!e.faceImageUri) {
        const def = defaultEmployees.find(d => d.employeeId === e.employeeId || d.email.toLowerCase() === e.email.toLowerCase());
        return { ...e, faceImageUri: def?.faceImageUri || '/enrolled_face.jpg' };
      }
      return e;
    });
  },
  saveEmployees: (emps: Employee[]) => setItem(STORAGE_KEYS.EMPLOYEES, emps),

  getDepartments: (): Department[] => getItem(STORAGE_KEYS.DEPARTMENTS, defaultDepartments),
  saveDepartments: (depts: Department[]) => setItem(STORAGE_KEYS.DEPARTMENTS, depts),

  getTeams: (): Team[] => getItem(STORAGE_KEYS.TEAMS, defaultTeams),
  saveTeams: (teams: Team[]) => setItem(STORAGE_KEYS.TEAMS, teams),

  getWorkSessions: (): WorkSession[] => {
    const stored = getItem(STORAGE_KEYS.WORK_SESSIONS, defaultWorkSessions);
    const clean = stored.filter(s => !['EMP1001', 'EMP1002', 'EMP1003', 'EMP1004', 'EMP1005', 'EMP1006'].includes(s.employeeId));
    defaultWorkSessions.forEach(d => {
      if (!clean.some(s => s.employeeId === d.employeeId)) {
        clean.push(d);
      }
    });
    return clean;
  },
  saveWorkSessions: (sessions: WorkSession[]) => setItem(STORAGE_KEYS.WORK_SESSIONS, sessions),

  getMonitoringEvents: (): MonitoringEvent[] => getItem(STORAGE_KEYS.MONITORING_EVENTS, []),
  addMonitoringEvent: (event: Omit<MonitoringEvent, 'id'>) => {
    const events = DB.getMonitoringEvents();
    const newEvt: MonitoringEvent = { ...event, id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4) };
    setItem(STORAGE_KEYS.MONITORING_EVENTS, [newEvt, ...events]);
    return newEvt;
  },

  getAttendance: (): AttendanceRecord[] => {
    const stored = getItem(STORAGE_KEYS.ATTENDANCE, defaultAttendance);
    const clean = stored.filter(a =>
      !['EMP1001', 'EMP1002', 'EMP1003', 'EMP1004', 'EMP1005', 'EMP1006', 'usr_admin', 'admin@company.com'].includes(a.employeeId) &&
      !a.employeeName?.toLowerCase().includes('administrator')
    );
    defaultAttendance.forEach(d => {
      if (!clean.some(a => a.employeeId === d.employeeId)) {
        clean.push(d);
      }
    });
    return clean;
  },
  saveAttendance: (att: AttendanceRecord[]) => setItem(STORAGE_KEYS.ATTENDANCE, att),

  getAuditLogs: (): AuditLog[] => getItem(STORAGE_KEYS.AUDIT_LOGS, defaultAuditLogs),
  addAuditLog: (log: Omit<AuditLog, 'id'>) => {
    const logs = DB.getAuditLogs();
    const newLog: AuditLog = { ...log, id: 'log_' + Date.now() };
    setItem(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs]);
    return newLog;
  },

  getSettings: (): SystemSettings => getItem(STORAGE_KEYS.SETTINGS, defaultSettings),
  saveSettings: (settings: SystemSettings) => setItem(STORAGE_KEYS.SETTINGS, settings),

  getSalaryConfig: (): SalaryConfig => {
    const now = new Date();
    const currentMonthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const stored = getItem<SalaryConfig | null>(STORAGE_KEYS.SALARY_CONFIG, null);
    const defaultRoleSalaries = {
      EMPLOYEE: 5000,
      HR: 8000,
      TL: 10000,
    };
    if (!stored) {
      return {
        monthlySalary: 5000,
        roleSalaries: defaultRoleSalaries,
        workHoursPerDay: 8.5,
        workDaysPerMonth: currentMonthDays,
        overrides: {},
      };
    }
    return {
      monthlySalary: stored.monthlySalary ?? 5000,
      roleSalaries: {
        EMPLOYEE: stored.roleSalaries?.EMPLOYEE ?? 5000,
        HR: stored.roleSalaries?.HR ?? 8000,
        TL: stored.roleSalaries?.TL ?? 10000,
      },
      workHoursPerDay: stored.workHoursPerDay === 8 ? 8.5 : (stored.workHoursPerDay ?? 8.5),
      workDaysPerMonth: stored.workDaysPerMonth === 26 ? currentMonthDays : (stored.workDaysPerMonth ?? currentMonthDays),
      overrides: stored.overrides || {},
    };
  },
  saveSalaryConfig: (config: SalaryConfig) => setItem(STORAGE_KEYS.SALARY_CONFIG, config),

  createEmployee: (empData: Omit<Employee, 'id'>, actorName: string, actorRole: UserRole): Employee => {
    const emps = DB.getEmployees();
    const isFaceEnrolled = empData.faceEnrolled || Boolean(empData.faceImageUri && empData.faceImageUri !== '/enrolled_face.jpg');
    const newEmp: Employee = {
      ...empData,
      id: 'emp_' + Date.now(),
      faceEnrolled: isFaceEnrolled,
      faceImageUri: empData.faceImageUri || '/enrolled_face.jpg',
      enrolledAt: empData.enrolledAt || (isFaceEnrolled ? new Date().toLocaleString() : undefined),
    };
    const updatedEmps = [newEmp, ...emps];
    DB.saveEmployees(updatedEmps);

    const users = DB.getUsers();
    const newUser: User = {
      id: 'usr_' + Date.now(),
      username: newEmp.employeeId,
      email: newEmp.email,
      fullName: newEmp.fullName,
      role: 'EMPLOYEE',
      employeeId: newEmp.employeeId,
      status: newEmp.status,
      passwordHash: newEmp.passwordHash,
      avatar: newEmp.faceImageUri,
    };
    DB.saveUsers([...users, newUser]);

    DB.addAuditLog({
      timestamp: new Date().toLocaleString(),
      actorName,
      actorRole,
      action: 'CREATE_EMPLOYEE',
      details: `Created employee ${newEmp.fullName} (${newEmp.employeeId}) with face enrollment: ${isFaceEnrolled ? 'YES' : 'NO'}`
    });

    // Automatically initialize WorkSession and AttendanceRecord for newly created employee
    const todayStr = new Date().toISOString().split('T')[0];
    const sessions = DB.getWorkSessions();
    if (!sessions.some(s => s.employeeId === newEmp.employeeId)) {
      const newSession: WorkSession = {
        id: 'ws_' + Date.now(),
        employeeId: newEmp.employeeId,
        employeeName: newEmp.fullName,
        date: todayStr,
        loginTime: '09:00 AM',
        activeSeconds: 0,
        idleSeconds: 0,
        breakSeconds: 0,
        awaySeconds: 0,
        straightForwardSeconds: 0,
        lookingAwaySeconds: 0,
        expectedLogout: '05:30 PM',
        status: 'OFFLINE',
      };
      DB.saveWorkSessions([...sessions, newSession]);
    }

    const attendance = DB.getAttendance();
    if (!attendance.some(a => a.employeeId === newEmp.employeeId && a.date === todayStr)) {
      const newAtt: AttendanceRecord = {
        id: 'att_' + Date.now(),
        employeeId: newEmp.employeeId,
        employeeName: newEmp.fullName,
        department: newEmp.department,
        team: newEmp.team,
        date: todayStr,
        status: 'PRESENT',
        loginTime: '09:00 AM',
        totalWorkTimeFormatted: '00h 00m',
        straightForwardFormatted: '00h 00m (100% Focus)',
      };
      DB.saveAttendance([...attendance, newAtt]);
    }

    return newEmp;
  },

  syncWorkSessionLive: (employeeId: string, liveData: Partial<WorkSession>) => {
    const sessions = DB.getWorkSessions();
    const idx = sessions.findIndex(s => s.employeeId === employeeId);
    const todayStr = new Date().toISOString().split('T')[0];

    if (idx !== -1) {
      sessions[idx] = { ...sessions[idx], ...liveData };
      DB.saveWorkSessions(sessions);
    } else {
      const newSess: WorkSession = {
        id: 'ws_' + Date.now(),
        employeeId,
        employeeName: liveData.employeeName || 'Employee',
        date: todayStr,
        loginTime: liveData.loginTime || '09:00 AM',
        activeSeconds: liveData.activeSeconds || 0,
        idleSeconds: liveData.idleSeconds || 0,
        breakSeconds: liveData.breakSeconds || 0,
        awaySeconds: liveData.awaySeconds || 0,
        straightForwardSeconds: liveData.straightForwardSeconds || 0,
        lookingAwaySeconds: liveData.lookingAwaySeconds || 0,
        expectedLogout: liveData.expectedLogout || '05:30 PM',
        status: liveData.status || 'ACTIVE',
      };
      DB.saveWorkSessions([newSess, ...sessions]);
    }

    // Sync to AttendanceRecord as well
    const attList = DB.getAttendance();
    const emp = DB.getEmployees().find(e => e.employeeId === employeeId || e.id === employeeId);
    const usr = DB.getUsers().find(u => u.id === employeeId || u.employeeId === employeeId || u.username.toLowerCase() === employeeId.toLowerCase());
    
    const empName = emp?.fullName || usr?.fullName || liveData.employeeName || 'Staff Member';
    const dept = emp?.department || (usr?.role === 'HR' ? 'Human Resources' : usr?.role === 'TL' ? 'Management' : 'Engineering');
    const teamName = emp?.team || (usr?.role === 'HR' ? 'HR Team' : usr?.role === 'TL' ? 'Team Lead' : 'Development');
    const idToUse = emp?.employeeId || usr?.employeeId || usr?.id || employeeId;

    const attIdx = attList.findIndex(a => (a.employeeId === idToUse || a.employeeId === employeeId || a.employeeName.toLowerCase() === empName.toLowerCase()) && a.date === todayStr);

    const activeSec = liveData.activeSeconds || 0;
    const straightSec = liveData.straightForwardSeconds || 0;
    const totalActivePlusAway = Math.max(1, straightSec + (liveData.lookingAwaySeconds || 0));
    const focusPct = Math.round((straightSec / totalActivePlusAway) * 100);

    const activeMins = Math.floor(activeSec / 60);
    const activeHrsStr = `${Math.floor(activeMins / 60).toString().padStart(2, '0')}h ${(activeMins % 60).toString().padStart(2, '0')}m`;

    const straightMins = Math.floor(straightSec / 60);
    const straightHrsStr = `${Math.floor(straightMins / 60).toString().padStart(2, '0')}h ${(straightMins % 60).toString().padStart(2, '0')}m (${focusPct}% Focus)`;

    if (attIdx !== -1) {
      attList[attIdx].loginTime = liveData.loginTime || attList[attIdx].loginTime;
      attList[attIdx].totalWorkTimeFormatted = activeHrsStr;
      attList[attIdx].straightForwardFormatted = straightHrsStr;
      DB.saveAttendance(attList);
    } else {
      const newAtt: AttendanceRecord = {
        id: 'att_' + Date.now(),
        employeeId: idToUse,
        employeeName: empName,
        department: dept,
        team: teamName,
        date: todayStr,
        status: 'PRESENT',
        loginTime: liveData.loginTime || '09:00 AM',
        totalWorkTimeFormatted: activeHrsStr,
        straightForwardFormatted: straightHrsStr,
      };
      DB.saveAttendance([newAtt, ...attList]);
    }
  },

  recordLogin: (user: User) => {
    if (user.role === 'ADMIN') return; // Do not record attendance for System Administrator

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const loginStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const empId = user.employeeId || user.id;

    // Check or create WorkSession
    const sessions = DB.getWorkSessions();
    if (!sessions.some(s => (s.employeeId === empId || s.employeeName.toLowerCase() === user.fullName.toLowerCase()) && s.date === todayStr)) {
      const newSession: WorkSession = {
        id: 'ws_' + Date.now(),
        employeeId: empId,
        employeeName: user.fullName,
        date: todayStr,
        loginTime: loginStr,
        activeSeconds: 0,
        idleSeconds: 0,
        breakSeconds: 0,
        awaySeconds: 0,
        straightForwardSeconds: 0,
        lookingAwaySeconds: 0,
        expectedLogout: '05:30 PM',
        status: 'ACTIVE',
      };
      DB.saveWorkSessions([newSession, ...sessions]);
    }

    // Check or create AttendanceRecord for User / HR / TL / Employee
    const attendance = DB.getAttendance();
    if (!attendance.some(a => (a.employeeId === empId || a.employeeName.toLowerCase() === user.fullName.toLowerCase()) && a.date === todayStr)) {
      const department = user.role === 'HR' ? 'Human Resources' : user.role === 'TL' ? 'Management' : 'Engineering';
      const team = user.role === 'HR' ? 'HR Team' : user.role === 'TL' ? 'Team Lead' : 'Development';

      const newAtt: AttendanceRecord = {
        id: 'att_' + Date.now(),
        employeeId: empId,
        employeeName: user.fullName,
        department,
        team,
        date: todayStr,
        status: 'PRESENT',
        loginTime: loginStr,
        totalWorkTimeFormatted: '00h 00m',
        straightForwardFormatted: '00h 00m (100% Focus)',
      };
      DB.saveAttendance([newAtt, ...attendance]);
    }
  },

  updateEmployeeStatus: (employeeId: string, newStatus: AccountStatus, actorName: string, actorRole: UserRole) => {
    const emps = DB.getEmployees();
    const idx = emps.findIndex(e => e.employeeId === employeeId || e.id === employeeId);
    if (idx !== -1) {
      emps[idx].status = newStatus;
      DB.saveEmployees(emps);

      const users = DB.getUsers();
      const uIdx = users.findIndex(u => u.employeeId === employeeId);
      if (uIdx !== -1) {
        users[uIdx].status = newStatus;
        DB.saveUsers(users);
      }

      DB.addAuditLog({
        timestamp: new Date().toLocaleString(),
        actorName,
        actorRole,
        action: 'UPDATE_EMPLOYEE_STATUS',
        details: `Updated employee ${emps[idx].fullName} status to ${newStatus}`
      });
    }
  },

  enrollFace: (employeeId: string, faceData: string, actorName: string, actorRole: UserRole, imageUri?: string) => {
    const emps = DB.getEmployees();
    const idx = emps.findIndex(e => e.employeeId === employeeId || e.id === employeeId);
    if (idx !== -1) {
      emps[idx].faceEnrolled = true;
      emps[idx].faceProfileData = faceData;
      if (imageUri) {
        emps[idx].faceImageUri = imageUri;
      }
      emps[idx].enrolledAt = new Date().toLocaleString();
      DB.saveEmployees(emps);

      // Sync avatar to User table
      const users = DB.getUsers();
      const uIdx = users.findIndex(u => u.employeeId === emps[idx].employeeId);
      if (uIdx !== -1) {
        users[uIdx].avatar = emps[idx].faceImageUri;
        DB.saveUsers(users);
      }

      DB.addAuditLog({
        timestamp: new Date().toLocaleString(),
        actorName,
        actorRole,
        action: 'ENROLL_FACE',
        details: `Enrolled biometric face profile for ${emps[idx].fullName} (${emps[idx].employeeId})`
      });
    }
  },

  updateEmployeeFaceProfile: (
    employeeId: string,
    faceImageUri: string,
    faceProfileData: string,
    faceVerificationEnabled: boolean,
    actorName: string,
    actorRole: UserRole
  ) => {
    const emps = DB.getEmployees();
    const idx = emps.findIndex(e => e.employeeId === employeeId || e.id === employeeId);
    if (idx !== -1) {
      const isEnrolled = Boolean(faceImageUri && faceImageUri !== '/enrolled_face.jpg');
      emps[idx].faceEnrolled = isEnrolled;
      emps[idx].faceImageUri = faceImageUri || '/enrolled_face.jpg';
      emps[idx].faceProfileData = faceProfileData || `descriptor_edited_${Date.now()}`;
      emps[idx].faceVerificationEnabled = faceVerificationEnabled;
      emps[idx].enrolledAt = new Date().toLocaleString();
      DB.saveEmployees(emps);

      const users = DB.getUsers();
      const uIdx = users.findIndex(u => u.employeeId === emps[idx].employeeId);
      if (uIdx !== -1) {
        users[uIdx].avatar = emps[idx].faceImageUri;
        DB.saveUsers(users);
      }

      DB.addAuditLog({
        timestamp: new Date().toLocaleString(),
        actorName,
        actorRole,
        action: 'EDIT_FACE_PROFILE',
        details: `Manually updated face capture image and storage parameters for ${emps[idx].fullName}`
      });
    }
  },

  resetPassword: (employeeId: string, newPassword: string, actorName: string, actorRole: UserRole) => {
    const emps = DB.getEmployees();
    const idx = emps.findIndex(e => e.employeeId === employeeId || e.id === employeeId);
    if (idx !== -1) {
      emps[idx].passwordHash = newPassword;
      DB.saveEmployees(emps);

      const users = DB.getUsers();
      const uIdx = users.findIndex(u => u.employeeId === employeeId);
      if (uIdx !== -1) {
        users[uIdx].passwordHash = newPassword;
        DB.saveUsers(users);
      }

      DB.addAuditLog({
        timestamp: new Date().toLocaleString(),
        actorName,
        actorRole,
        action: 'RESET_PASSWORD',
        details: `Reset password for employee ${emps[idx].fullName}`
      });
    }
  },

  getAllRawData: () => {
    return {
      users: DB.getUsers(),
      employees: DB.getEmployees(),
      departments: DB.getDepartments(),
      teams: DB.getTeams(),
      workSessions: DB.getWorkSessions(),
      monitoringEvents: DB.getMonitoringEvents(),
      attendance: DB.getAttendance(),
      auditLogs: DB.getAuditLogs(),
      settings: DB.getSettings(),
    };
  },

  exportAllData: () => {
    const data = DB.getAllRawData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LogTime_Database_Dump_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importAllData: (jsonData: any) => {
    if (jsonData.users) setItem(STORAGE_KEYS.USERS, jsonData.users);
    if (jsonData.employees) setItem(STORAGE_KEYS.EMPLOYEES, jsonData.employees);
    if (jsonData.departments) setItem(STORAGE_KEYS.DEPARTMENTS, jsonData.departments);
    if (jsonData.teams) setItem(STORAGE_KEYS.TEAMS, jsonData.teams);
    if (jsonData.workSessions) setItem(STORAGE_KEYS.WORK_SESSIONS, jsonData.workSessions);
    if (jsonData.monitoringEvents) setItem(STORAGE_KEYS.MONITORING_EVENTS, jsonData.monitoringEvents);
    if (jsonData.attendance) setItem(STORAGE_KEYS.ATTENDANCE, jsonData.attendance);
    if (jsonData.auditLogs) setItem(STORAGE_KEYS.AUDIT_LOGS, jsonData.auditLogs);
    if (jsonData.settings) setItem(STORAGE_KEYS.SETTINGS, jsonData.settings);
  },

  resetAllData: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
};
