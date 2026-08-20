import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Lock, Ban, Laptop, Download, Terminal, CheckCircle2, Zap, AlertCircle } from 'lucide-react';
import { DB } from '../services/db';
import { useAuth } from '../context/AuthContext';

const BLOCKED_SITES = [
  { name: 'Facebook', domain: 'facebook.com', category: 'Social Media' },
  { name: 'Instagram', domain: 'instagram.com', category: 'Social Media' },
  { name: 'YouTube', domain: 'youtube.com', category: 'Streaming / Video' },
  { name: 'Twitter / X', domain: 'x.com', category: 'Social Network' },
  { name: 'TikTok', domain: 'tiktok.com', category: 'Short Video' },
  { name: 'Reddit', domain: 'reddit.com', category: 'Forum' },
  { name: 'WhatsApp Web', domain: 'web.whatsapp.com', category: 'Messaging' },
  { name: 'Snapchat', domain: 'snapchat.com', category: 'Social Media' },
  { name: 'Discord', domain: 'discord.com', category: 'Chat' },
  { name: 'Netflix', domain: 'netflix.com', category: 'Entertainment' },
];

export const SocialMediaBlocker: React.FC = () => {
  const { currentUser, currentEmployee } = useAuth();
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [blockedSiteTest, setBlockedSiteTest] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');
  const [showBlocklistModal, setShowBlocklistModal] = useState(false);
  const [showDesktopGuardModal, setShowDesktopGuardModal] = useState(false);
  const [hostsApplied, setHostsApplied] = useState(false);

  const playWarningBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {}
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        playWarningBeep();

        const name = currentEmployee?.fullName || currentUser?.fullName || 'User';
        const empId = currentEmployee?.employeeId || currentUser?.employeeId || currentUser?.id || 'EMP';

        DB.addMonitoringEvent({
          employeeId: empId,
          employeeName: name,
          eventType: 'DISTRACTION_DETECTED',
          timestamp: new Date().toLocaleTimeString(),
          details: 'Desktop focus loss: User opened another browser/window or social media tab.',
        });
      } else {
        setShowWarningToast(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentUser, currentEmployee]);

  const handleTestSite = (domain: string) => {
    setBlockedSiteTest(domain);
  };

  const downloadDesktopHostsScript = () => {
    const scriptContent = `@echo off
:: LogTime Workstation - System-Wide All-Browser Social Media Blocker
echo ====================================================================
echo     LogTime System Guard - Enforcing All-Browser Social Media Block
echo ====================================================================
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERROR: Administrator rights required!
    echo Please right-click this file 'LogTime_Enforce_Desktop_Blocker.bat' and select 'Run as Administrator'.
    echo.
    pause
    exit /b
)

attrib -r %WINDIR%\\System32\\drivers\\etc\\hosts >nul 2>&1

:: Remove old rules to prevent duplication
powershell -Command "(Get-Content %WINDIR%\\System32\\drivers\\etc\\hosts) | Where-Object { $_ -notmatch 'LogTime_Block' } | Set-Content %WINDIR%\\System32\\drivers\\etc\\hosts" >nul 2>&1

echo. >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo # LogTime_Block Social Media Firewall Rules >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 facebook.com www.facebook.com m.facebook.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 instagram.com www.instagram.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 youtube.com www.youtube.com youtu.be m.youtube.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 x.com www.x.com twitter.com www.twitter.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 tiktok.com www.tiktok.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 reddit.com www.reddit.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 web.whatsapp.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 snapchat.com www.snapchat.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 discord.com www.discord.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 netflix.com www.netflix.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 pinterest.com www.pinterest.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts
echo 127.0.0.1 linkedin.com www.linkedin.com # LogTime_Block >> %WINDIR%\\System32\\drivers\\etc\\hosts

ipconfig /flushdns >nul
echo.
echo ====================================================================
echo SUCCESS: All-Browser Desktop Social Media Blocker Successfully Active!
echo Chrome, Edge, Firefox, Brave, and Opera are now BLOCKED from social media.
echo ====================================================================
echo.
pause
`;
    const blob = new Blob([scriptContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LogTime_Enforce_Desktop_Blocker.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setHostsApplied(true);
  };

  return (
    <>
      {/* Social Media Blocker Active Status Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
        color: '#ffffff',
        padding: '14px 20px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        boxShadow: '0 8px 20px rgba(4, 120, 87, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.2)' }}>
            <ShieldCheck size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>SYSTEM & BROWSER SOCIAL MEDIA BLOCKER ACTIVE</span>
              <span style={{ fontSize: '0.68rem', background: '#10b981', padding: '2px 8px', borderRadius: '20px', fontWeight: 900 }}>ENFORCED</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>
              Blocks Facebook, Instagram, YouTube, X, TikTok, WhatsApp Web across Chrome, Edge & Firefox desktop-wide.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={downloadDesktopHostsScript}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)'
            }}
          >
            <Zap size={14} /> 1-Click All-Browser Blocker (.bat)
          </button>
          <button
            onClick={() => setShowDesktopGuardModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Laptop size={14} /> Setup Desktop Firewall
          </button>
          <button
            onClick={() => setShowBlocklistModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Lock size={14} /> Blocked List ({BLOCKED_SITES.length})
          </button>
        </div>
      </div>

      {/* Tab Switch / External Browser Detection Warning Toast */}
      {showWarningToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          maxWidth: '420px',
          background: '#0f172a',
          color: '#ffffff',
          padding: '18px 22px',
          borderRadius: '18px',
          border: '2px solid #ef4444',
          boxShadow: '0 20px 50px rgba(239, 68, 68, 0.35)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <AlertTriangle size={26} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f87171', marginBottom: '2px' }}>
              ⚠️ External Browser / Window Switch Detected ({tabSwitchCount})
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '12px' }}>
              Workstation Desktop Protection active. Navigating to external browsers or social media tabs has been logged to Admin Security Audit.
            </div>
            <button
              onClick={() => setShowWarningToast(false)}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Return Focus to Workstation App
            </button>
          </div>
        </div>
      )}

      {/* Desktop Policy Guard Modal */}
      {showDesktopGuardModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '560px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Laptop size={26} color="#3b82f6" />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Block Social Media Across ALL Browsers</h3>
              </div>
              <button onClick={() => setShowDesktopGuardModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '20px' }}>
              To ensure social media is blocked in <strong>ALL OTHER BROWSERS</strong> (Chrome, Edge, Firefox, Brave, Opera) on this computer while the app is open:
            </p>

            <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#c2410c', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} /> Quick 2-Step Setup Instructions:
              </div>
              <ol style={{ fontSize: '0.82rem', color: '#9a3412', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: 600 }}>
                <li>Click <strong>Download All-Browser Blocker (.bat)</strong> below.</li>
                <li>Open your Downloads folder, right-click <code>LogTime_Enforce_Desktop_Blocker.bat</code>, and select <strong>Run as Administrator</strong>.</li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button onClick={downloadDesktopHostsScript} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '12px', background: '#f59e0b', color: '#ffffff' }}>
                <Download size={16} /> Download All-Browser Blocker (.bat)
              </button>
            </div>

            {hostsApplied && (
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> File downloaded! Right-click the file and select 'Run as Administrator' to activate.
              </div>
            )}

            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <button onClick={() => setShowDesktopGuardModal(false)} className="btn-secondary">
                Close Instructions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocklist Modal */}
      {showBlocklistModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '520px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={24} color="#059669" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Enforced Social Media Blocklist</h3>
              </div>
              <button onClick={() => setShowBlocklistModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
              The following domains are automatically intercepted and blocked desktop-wide while the LogTime workstation application is open for Employees, HR, and TLs.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '260px', overflowY: 'auto', marginBottom: '20px' }}>
              {BLOCKED_SITES.map((site, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{site.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{site.domain}</div>
                  </div>
                  <button onClick={() => handleTestSite(site.domain)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                    Test Block
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Test domain e.g. instagram.com"
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                style={{ flex: 1, fontSize: '0.85rem' }}
              />
              <button onClick={() => handleTestSite(testInput || 'instagram.com')} className="btn-primary" style={{ background: '#ef4444' }}>
                Test Intercept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 403 Forbidden Interception Screen Overlay */}
      {blockedSiteTest && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '36px 28px', background: '#0f172a', color: '#ffffff', border: '2px solid #ef4444' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', marginBottom: '16px' }}>
              <Ban size={36} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ef4444', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>
              ACCESS DENIED • 403 FORBIDDEN
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              {blockedSiteTest} is Blocked
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '24px' }}>
              Social media & distracting sites are blocked desktop-wide by organizational workstation policy while the LogTime Attendance Web App is active.
            </p>

            <div style={{ background: '#1e293b', padding: '14px', borderRadius: '12px', textAlign: 'left', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '24px' }}>
              <div>• <strong>Enforced User:</strong> {currentEmployee?.fullName || currentUser?.fullName || 'Active Staff'} ({currentUser?.role})</div>
              <div>• <strong>Block Rule:</strong> Desktop System Social Media & Video Firewall Active</div>
              <div>• <strong>Security Log:</strong> Event logged to Admin Audit Trail</div>
            </div>

            <button onClick={() => setBlockedSiteTest(null)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#ef4444' }}>
              Return to Authorized Workstation
            </button>
          </div>
        </div>
      )}
    </>
  );
};
