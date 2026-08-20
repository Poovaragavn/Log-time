import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWorkSession } from '../../context/WorkSessionContext';
import { CameraFeed } from '../../components/CameraFeed';
import { UserCheck, AlertCircle, CheckCircle, Camera, ArrowUpRight, Eye, EyeOff, Sparkles, Laptop, ShieldCheck } from 'lucide-react';
import { DB } from '../../services/db';
import { playWelcomeSpeech } from '../../utils/welcomeSpeech';

export const EmployeeLogin: React.FC = () => {
  const { validateCredentials, completeFaceVerification } = useAuth();
  const { setWorkStatus, initSessionOnLogin } = useWorkSession();

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'CREDENTIALS' | 'FACE_VERIFICATION' | 'VERIFIED'>('CREDENTIALS');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = validateCredentials(employeeId, password, 'EMPLOYEE');
      if (res.success && res.user) {
        setAuthenticatedUser(res.user);
        setStep('FACE_VERIFICATION');
      } else {
        setError(res.message || 'Employee authentication failed.');
      }
      setLoading(false);
    }, 500);
  };

  const handleFaceSuccess = () => {
    if (authenticatedUser) {
      completeFaceVerification(authenticatedUser);
    }
    setStep('VERIFIED');
    initSessionOnLogin();
    setWorkStatus('ACTIVE');

    const empRecord = DB.getEmployees().find(e =>
      (authenticatedUser?.employeeId && e.employeeId === authenticatedUser.employeeId) ||
      (authenticatedUser?.username && e.username?.toLowerCase() === authenticatedUser.username?.toLowerCase())
    );
    const gender = empRecord?.gender || 'female';
    const name = authenticatedUser?.fullName || 'Employee';

    playWelcomeSpeech(name, gender, 300);

    DB.addMonitoringEvent({
      employeeId: authenticatedUser?.employeeId || employeeId,
      employeeName: name,
      eventType: 'FACE_PRESENT',
      timestamp: new Date().toLocaleTimeString(),
      details: 'Biometric face verification passed. Work session timer started.',
    });

    setTimeout(() => {
      window.location.hash = '#/employee/dashboard';
    }, 2200);
  };

  const handleFaceFailure = (reason: string) => {
    setError(`Biometric mismatch: ${reason}. Center your face in camera frame and click Retry Biometric Verification.`);
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
          background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #06b6d4 100%)',
          color: '#ffffff',
          boxShadow: '0 12px 32px rgba(16, 185, 129, 0.4)',
          marginBottom: '14px'
        }}>
          <Sparkles size={30} />
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
          WorkStation Attendance is ready to track.
        </h1>
      </div>

      {/* Floating 3D Side Cards */}
      <div className="login-3d-side-card left" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 800, fontSize: '0.8rem' }}>
          <Laptop size={18} /> Desktop Eye Focus
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
          Straight-forward laptop screen engagement logging.
        </div>
      </div>

      <div className="login-3d-side-card right" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 800, fontSize: '0.8rem' }}>
          <ShieldCheck size={18} /> Face Verification
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
          Biometric camera check for authorized daily session login.
        </div>
      </div>

      {/* Central 3D Glass Box with Multi-Color Shifting Input Cards */}
      <div
        className="pinterest-login-box emp-glow"
        style={{
          maxWidth: step === 'FACE_VERIFICATION' ? '500px' : '460px',
          borderRadius: step === 'FACE_VERIFICATION' ? '32px' : '40px',
          padding: step === 'FACE_VERIFICATION' ? '36px 30px' : '44px 38px',
        }}
      >
        {step === 'CREDENTIALS' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', color: '#10b981' }}>
              <UserCheck size={22} />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                EMPLOYEE PORTAL
              </span>
            </div>

            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.02em', marginBottom: '20px' }}>
              Employee Login
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

            <form onSubmit={handlePasswordSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <input
                  type="text"
                  className="pinterest-input"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
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
                  placeholder="Password"
                  required
                  autoComplete="new-password"
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
                    color: showPassword ? '#10b981' : '#94a3b8',
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

              <button type="submit" className="pinterest-btn" disabled={loading} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                <span>{loading ? 'AUTHENTICATING...' : 'Continue to Face Verification'}</span>
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
              <a href="#/admin/login" style={{ color: '#818cf8', textDecoration: 'none' }}>Admin Portal</a>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <a href="#/hr/login" style={{ color: '#ec4899', textDecoration: 'none' }}>HR Portal</a>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <a href="#/tl/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>Team Lead</a>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <a href="#/" style={{ color: '#6366f1', textDecoration: 'none' }}>Home</a>
            </div>
          </>
        )}

        {step === 'FACE_VERIFICATION' && (
          <div style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                <Camera size={18} /> STEP 2: BIOMETRIC FACE MATCH
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                Welcome, {authenticatedUser?.fullName || 'Employee'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Align your face inside the frame for live biometric verification
              </p>
            </div>

            <CameraFeed
              mode="VERIFY"
              targetName={authenticatedUser?.fullName || 'Employee'}
              targetFaceUri={
                DB.getEmployees().find(e =>
                  (authenticatedUser?.employeeId && e.employeeId === authenticatedUser.employeeId) ||
                  (authenticatedUser?.username && e.username?.toLowerCase() === authenticatedUser.username?.toLowerCase()) ||
                  (authenticatedUser?.email && e.email?.toLowerCase() === authenticatedUser.email?.toLowerCase())
                )?.faceImageUri || authenticatedUser?.avatar || '/enrolled_face.jpg'
              }
              onSuccess={handleFaceSuccess}
              onFailure={handleFaceFailure}
            />
          </div>
        )}

        {step === 'VERIFIED' && (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <CheckCircle size={64} color="#10b981" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>
              ACCESS GRANTED
            </h2>
            <p style={{ color: '#059669', fontSize: '0.9rem', marginTop: '8px', fontWeight: 700 }}>
              Work session initialized. Redirecting to Dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
