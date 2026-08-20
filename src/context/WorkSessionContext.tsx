import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { type WorkStatus, type EventType, type FaceGazeState, DB } from '../services/db';
import { useAuth } from './AuthContext';

interface WorkSessionContextType {
  activeSeconds: number;
  idleSeconds: number;
  breakSeconds: number;
  awaySeconds: number;
  straightForwardSeconds: number;
  lookingAwaySeconds: number;
  gazeState: FaceGazeState;
  workStatus: WorkStatus;
  faceVerified: boolean;
  facePresenceStatus: EventType;
  loginTime: string;
  expectedLogout: string;
  remainingSeconds: number;
  totalRequiredSeconds: number;
  focusPercentage: number;
  setWorkStatus: (status: WorkStatus) => void;
  setGazeState: (state: FaceGazeState) => void;
  setFaceVerified: (verified: boolean) => void;
  setFacePresenceStatus: (status: EventType) => void;
  toggleBreak: () => void;
  resetSession: () => void;
  initSessionOnLogin: (customLoginTime?: string) => void;
  formatDuration: (totalSec: number) => string;
}

const WorkSessionContext = createContext<WorkSessionContextType | undefined>(undefined);

// Helper function to format 12-hour time (e.g. 09:15 AM)
const format12HourTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Helper function to add hours & minutes to a Date
const addTimeDuration = (date: Date, hours: number, minutes: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

export const WorkSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentEmployee, currentUser, logout } = useAuth();

  // Fresh Real-Time Session Counters (Starting clean from 00:00:00 on login)
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [awaySeconds, setAwaySeconds] = useState(0);
  const [straightForwardSeconds, setStraightForwardSeconds] = useState(0);
  const [lookingAwaySeconds, setLookingAwaySeconds] = useState(0);

  const [gazeState, setGazeState] = useState<FaceGazeState>('STRAIGHT_FORWARD');
  const [workStatus, setWorkStatus] = useState<WorkStatus>('ACTIVE');
  const [faceVerified, setFaceVerified] = useState(true);
  const [facePresenceStatus, setFacePresenceStatus] = useState<EventType>('FACE_PRESENT');

  // Real-Time Login Time & Expected Logout (+8 hours 30 mins)
  const [loginTime, setLoginTime] = useState<string>(() => format12HourTime(new Date()));
  const [expectedLogout, setExpectedLogout] = useState<string>(() => format12HourTime(addTimeDuration(new Date(), 8, 30)));

  const totalRequiredSeconds = 8.5 * 3600; // 8.5 hours shift
  const remainingSeconds = Math.max(0, totalRequiredSeconds - activeSeconds);

  const totalActivePlusAway = straightForwardSeconds + lookingAwaySeconds;
  const focusPercentage = totalActivePlusAway > 0
    ? Math.min(100, Math.max(0, Math.round((straightForwardSeconds / totalActivePlusAway) * 100)))
    : 100;

  // Use refs to track latest state inside persistent 1-second timer
  const gazeStateRef = useRef(gazeState);
  const workStatusRef = useRef(workStatus);
  const faceVerifiedRef = useRef(faceVerified);
  const remainingSecondsRef = useRef(remainingSeconds);

  useEffect(() => {
    gazeStateRef.current = gazeState;
  }, [gazeState]);

  useEffect(() => {
    workStatusRef.current = workStatus;
  }, [workStatus]);

  useEffect(() => {
    faceVerifiedRef.current = faceVerified;
  }, [faceVerified]);

  useEffect(() => {
    remainingSecondsRef.current = remainingSeconds;
  }, [remainingSeconds]);

  // Helper to load existing same-day work session from DB
  const loadSameDaySession = () => {
    const activeUserId = currentEmployee?.employeeId || currentUser?.employeeId || currentUser?.id;
    const activeName = currentEmployee?.fullName || currentUser?.fullName;
    if (!activeUserId && !activeName) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    const sessions = DB.getWorkSessions();
    return sessions.find(s =>
      s.date === todayStr &&
      (s.employeeId === activeUserId || (activeName && s.employeeName.toLowerCase() === activeName.toLowerCase()))
    );
  };

  // Restore same-day session counters on component mount or user change
  useEffect(() => {
    const existing = loadSameDaySession();
    if (existing) {
      setLoginTime(existing.loginTime || format12HourTime(new Date()));
      setExpectedLogout(existing.expectedLogout || format12HourTime(addTimeDuration(new Date(), 8, 30)));
      setActiveSeconds(existing.activeSeconds || 0);
      setStraightForwardSeconds(existing.straightForwardSeconds || 0);
      setIdleSeconds(existing.idleSeconds || 0);
      setBreakSeconds(existing.breakSeconds || 0);
      setAwaySeconds(existing.awaySeconds || 0);
      setLookingAwaySeconds(existing.lookingAwaySeconds || 0);
    }
  }, [currentEmployee, currentUser]);

  // Real-time session initializer when user logs in
  const initSessionOnLogin = (customLoginTime?: string) => {
    const existing = loadSameDaySession();
    const now = new Date();

    if (existing && existing.activeSeconds > 0) {
      // Resume existing same-day session seamlessly from last logged hours!
      setLoginTime(existing.loginTime || format12HourTime(now));
      setExpectedLogout(existing.expectedLogout || format12HourTime(addTimeDuration(now, 8, 30)));

      setActiveSeconds(existing.activeSeconds || 0);
      setStraightForwardSeconds(existing.straightForwardSeconds || 0);
      setIdleSeconds(existing.idleSeconds || 0);
      setBreakSeconds(existing.breakSeconds || 0);
      setAwaySeconds(existing.awaySeconds || 0);
      setLookingAwaySeconds(existing.lookingAwaySeconds || 0);
    } else {
      // Fresh new session for today
      const loginStr = customLoginTime || format12HourTime(now);
      const logoutDate = addTimeDuration(now, 8, 30);
      const logoutStr = format12HourTime(logoutDate);

      setLoginTime(loginStr);
      setExpectedLogout(logoutStr);

      setActiveSeconds(0);
      setStraightForwardSeconds(0);
      setIdleSeconds(0);
      setBreakSeconds(0);
      setAwaySeconds(0);
      setLookingAwaySeconds(0);
    }

    setWorkStatus('ACTIVE');
    setFaceVerified(true);
  };

  // AUTOMATIC SHIFT END / LOG OFF CAMERA OFF CHECKER
  useEffect(() => {
    if (workStatus === 'ACTIVE' && activeSeconds > 10 && remainingSecondsRef.current <= 0) {
      setWorkStatus('OFFLINE');
      setFaceVerified(false);

      if (currentEmployee) {
        DB.addMonitoringEvent({
          employeeId: currentEmployee.employeeId,
          employeeName: currentEmployee.fullName,
          eventType: 'FACE_ABSENT',
          timestamp: new Date().toLocaleTimeString(),
          details: `Shift time completed at ${expectedLogout}. Automatic log off & camera shutdown initiated.`,
        });
      }

      alert(`Shift completed for today! Expected logout (${expectedLogout}) reached. Camera turned off & logging off automatically.`);
      logout();
      window.location.hash = '#/employee/login';
    }
  }, [activeSeconds, remainingSeconds, workStatus, expectedLogout, currentEmployee, logout]);

  // UNINTERRUPTED CONTINUOUS 1-SECOND TICKER
  useEffect(() => {
    const interval = setInterval(() => {
      const currentWorkStatus = workStatusRef.current;
      const currentGazeState = gazeStateRef.current;
      const isVerified = faceVerifiedRef.current;

      if (currentWorkStatus === 'OFFLINE' || !isVerified) return;

      if (currentWorkStatus === 'ACTIVE') {
        setActiveSeconds(prev => prev + 1);

        if (currentGazeState === 'STRAIGHT_FORWARD') {
          setStraightForwardSeconds(prev => prev + 1);
        } else {
          setLookingAwaySeconds(prev => prev + 1);
        }
      } else if (currentWorkStatus === 'IDLE') {
        setIdleSeconds(prev => prev + 1);
        setLookingAwaySeconds(prev => prev + 1);
      } else if (currentWorkStatus === 'BREAK') {
        setBreakSeconds(prev => prev + 1);
      } else if (currentWorkStatus === 'AWAY') {
        setAwaySeconds(prev => prev + 1);
        setLookingAwaySeconds(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Periodic DB Sync Effect for real-time reporting across Admin/HR/TL dashboards for Employee, HR, and TL
  useEffect(() => {
    const activeUserId = currentEmployee?.employeeId || currentUser?.employeeId || currentUser?.id;
    const activeName = currentEmployee?.fullName || currentUser?.fullName || 'Staff Member';

    if (activeUserId && workStatus !== 'OFFLINE') {
      DB.syncWorkSessionLive(activeUserId, {
        employeeName: activeName,
        loginTime,
        expectedLogout,
        activeSeconds,
        idleSeconds,
        breakSeconds,
        awaySeconds,
        straightForwardSeconds,
        lookingAwaySeconds,
        status: workStatus,
      });
    }
  }, [activeSeconds, workStatus, currentEmployee, currentUser, loginTime, expectedLogout, idleSeconds, breakSeconds, awaySeconds, straightForwardSeconds, lookingAwaySeconds]);

  const toggleBreak = () => {
    if (workStatus === 'BREAK') {
      setWorkStatus('ACTIVE');
      DB.addMonitoringEvent({
        employeeId: currentEmployee?.employeeId || 'EMP',
        employeeName: currentEmployee?.fullName || 'User',
        eventType: 'FACE_PRESENT',
        timestamp: new Date().toLocaleTimeString(),
        details: 'Resumed work session from break',
      });
    } else {
      setWorkStatus('BREAK');
      DB.addMonitoringEvent({
        employeeId: currentEmployee?.employeeId || 'EMP',
        employeeName: currentEmployee?.fullName || 'User',
        eventType: 'FACE_PRESENT',
        timestamp: new Date().toLocaleTimeString(),
        details: 'Started official break',
      });
    }
  };

  const resetSession = () => {
    setActiveSeconds(0);
    setIdleSeconds(0);
    setBreakSeconds(0);
    setAwaySeconds(0);
    setStraightForwardSeconds(0);
    setLookingAwaySeconds(0);
    setWorkStatus('ACTIVE');
    setFaceVerified(false);
  };

  const formatDuration = (totalSec: number): string => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <WorkSessionContext.Provider
      value={{
        activeSeconds,
        idleSeconds,
        breakSeconds,
        awaySeconds,
        straightForwardSeconds,
        lookingAwaySeconds,
        gazeState,
        workStatus,
        faceVerified,
        facePresenceStatus,
        loginTime,
        expectedLogout,
        remainingSeconds,
        totalRequiredSeconds,
        focusPercentage,
        setWorkStatus,
        setGazeState,
        setFaceVerified,
        setFacePresenceStatus,
        toggleBreak,
        resetSession,
        initSessionOnLogin,
        formatDuration,
      }}
    >
      {children}
    </WorkSessionContext.Provider>
  );
};

export const useWorkSession = () => {
  const context = useContext(WorkSessionContext);
  if (!context) {
    throw new Error('useWorkSession must be used within a WorkSessionProvider');
  }
  return context;
};
