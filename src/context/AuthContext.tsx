import React, { createContext, useContext, useState, useEffect } from 'react';
import { type User, type UserRole, DB, type Employee } from '../services/db';

interface AuthContextType {
  currentUser: User | null;
  currentEmployee: Employee | null;
  login: (identifier: string, password: string, requiredRole: UserRole) => { success: boolean; message?: string; user?: User };
  validateCredentials: (identifier: string, password: string, requiredRole: UserRole) => { success: boolean; message?: string; user?: User };
  completeFaceVerification: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'logtime_active_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.role === 'EMPLOYEE') {
      const emps = DB.getEmployees();
      const emp = emps.find(e => e.employeeId === currentUser.employeeId || e.username === currentUser.username);
      setCurrentEmployee(emp || null);
    } else {
      setCurrentEmployee(null);
    }
  }, [currentUser]);

  const validateCredentials = (identifier: string, password: string, requiredRole: UserRole) => {
    const cleanId = identifier.trim().toLowerCase();
    const users = DB.getUsers();
    const user = users.find(u =>
      u.username.toLowerCase() === cleanId ||
      u.email?.toLowerCase() === cleanId ||
      u.employeeId?.toLowerCase() === cleanId ||
      (cleanId === 'admin' && u.role === 'ADMIN') ||
      (cleanId === 'hr' && u.role === 'HR') ||
      (cleanId === 'tl' && u.role === 'TL')
    );

    if (!user) {
      return { success: false, message: 'Invalid credentials. User not found.' };
    }

    if (user.passwordHash !== password) {
      return { success: false, message: 'Invalid password. Please check your password.' };
    }

    if (user.role !== requiredRole) {
      return { success: false, message: `Access denied. Account is authorized for ${user.role} portal, not ${requiredRole}.` };
    }

    if (user.status !== 'ACTIVE') {
      return { success: false, message: 'Your account is currently inactive or suspended. Please contact HR.' };
    }

    return { success: true, user };
  };

  const completeFaceVerification = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    DB.recordLogin(user);

    DB.addAuditLog({
      timestamp: new Date().toLocaleString(),
      actorName: user.fullName,
      actorRole: user.role,
      action: 'USER_LOGIN',
      details: `Successful biometric face login to ${user.role} portal`,
    });
  };

  const login = (identifier: string, password: string, requiredRole: UserRole) => {
    const val = validateCredentials(identifier, password, requiredRole);
    if (!val.success || !val.user) {
      return val;
    }

    setCurrentUser(val.user);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(val.user));
    DB.recordLogin(val.user);

    DB.addAuditLog({
      timestamp: new Date().toLocaleString(),
      actorName: val.user.fullName,
      actorRole: val.user.role,
      action: 'USER_LOGIN',
      details: `Successful login to ${requiredRole} portal`,
    });

    return { success: true, user: val.user };
  };

  const logout = () => {
    if (currentUser) {
      DB.addAuditLog({
        timestamp: new Date().toLocaleString(),
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        action: 'USER_LOGOUT',
        details: 'User logged out of session',
      });
    }
    setCurrentUser(null);
    setCurrentEmployee(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentEmployee,
        login,
        validateCredentials,
        completeFaceVerification,
        logout,
        isAuthenticated: !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
