import React, { useEffect, useState, useRef } from 'react';
import { useWorkSession } from '../context/WorkSessionContext';
import { useAuth } from '../context/AuthContext';
import { DB } from '../services/db';
import { PauseCircle, PlayCircle, Camera, RefreshCw, Compass, ShieldAlert, LogOut, Eye, ChevronUp, ChevronDown } from 'lucide-react';

export const MonitoringWidget: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const {
    workStatus,
    setWorkStatus,
    toggleBreak,
    formatDuration,
    straightForwardSeconds,
    lookingAwaySeconds,
    gazeState,
    setGazeState,
    setFacePresenceStatus,
    loginTime,
    expectedLogout,
    focusPercentage,
    setFaceVerified,
  } = useWorkSession();

  const [expanded, setExpanded] = useState(false); // Collapsed by default as floating background pill bar
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const [multipleFacesDetected, setMultipleFacesDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Workstation activity detector
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      if (workStatus === 'IDLE') {
        setWorkStatus('ACTIVE');
        if (currentUser) {
          DB.addMonitoringEvent({
            employeeId: currentUser.employeeId || currentUser.username,
            employeeName: currentUser.fullName,
            eventType: 'FACE_PRESENT',
            timestamp: new Date().toLocaleTimeString(),
            details: `Workstation activity detected for ${currentUser.role}`,
          });
        }
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [workStatus, currentUser, setWorkStatus]);

  // Idle check timer
  useEffect(() => {
    const settings = DB.getSettings();
    const thresholdMs = (settings.idleThresholdSeconds || 300) * 1000;

    const interval = setInterval(() => {
      if (workStatus === 'ACTIVE' && Date.now() - lastActivity > thresholdMs) {
        setWorkStatus('IDLE');
        if (currentUser) {
          DB.addMonitoringEvent({
            employeeId: currentUser.employeeId || currentUser.username,
            employeeName: currentUser.fullName,
            eventType: 'FACE_PRESENT',
            timestamp: new Date().toLocaleTimeString(),
            details: `No activity detected. Workstatus set to IDLE for ${currentUser.role}`,
          });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lastActivity, workStatus, currentUser, setWorkStatus]);

  // CONTINUOUS BACKGROUND COMPUTER VISION DETECTOR (Runs even when MINIMIZED!)
  useEffect(() => {
    if (workStatus !== 'ACTIVE') return;

    let animFrame: number;
    let lastTime = 0;

    const analyzeVideoFrame = (timestamp: number) => {
      if (timestamp - lastTime > 250) { // 250ms frame analysis
        lastTime = timestamp;

        if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            canvas.width = 160;
            canvas.height = 120;
            ctx.drawImage(video, 0, 0, 160, 120);

            const frame = ctx.getImageData(0, 0, 160, 120);
            const data = frame.data;

            let centerSum = 0;
            let centerVarianceSum = 0;
            let eyeZoneSum = 0;
            let leftEyeSum = 0;
            let rightEyeSum = 0;
            let leftSum = 0;
            let rightSum = 0;
            let centerCount = 0;
            let leftCount = 0;
            let rightCount = 0;


            let leftSkinCount = 0;
            let centerSkinCount = 0;
            let rightSkinCount = 0;

            for (let y = 20; y < 100; y += 2) {
              for (let x = 10; x < 150; x += 2) {
                const idx = (y * 160 + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                const varColor = Math.abs(r - g) + Math.abs(g - b);

                const isSkin = (r > 40) && (g > 20) && (b > 15) && (r > b) &&
                               ((r - Math.min(g, b)) > 15) && (Math.abs(r - g) < 70);

                if (isSkin) {
                  if (x < 45) leftSkinCount++;
                  else if (x > 115) rightSkinCount++;
                  else centerSkinCount++;
                }

                // EYE LEVEL ZONE (Y: 25 to 55px)
                if (y >= 25 && y <= 55) {
                  eyeZoneSum += lum;
                  if (x >= 40 && x < 80) leftEyeSum += lum;
                  if (x >= 80 && x <= 120) rightEyeSum += lum;
                }

                // Center Face Box (X: 45 to 115)
                if (x >= 45 && x <= 115 && y >= 25 && y <= 95) {
                  centerSum += lum;
                  centerCount++;
                  centerVarianceSum += varColor;
                } else if (x < 45) {
                  leftSum += lum;
                  leftCount++;
                } else if (x > 115) {
                  rightSum += lum;
                  rightCount++;
                }
              }
            }

            const avgCenterLum = centerCount > 0 ? centerSum / centerCount : 0;
            const avgCenterVar = centerCount > 0 ? centerVarianceSum / centerCount : 0;
            const avgLeftLum = leftCount > 0 ? leftSum / leftCount : 1;
            const avgRightLum = rightCount > 0 ? rightSum / rightCount : 1;

            const lrRatio = avgLeftLum / avgRightLum;
            const eyeGazeRatio = leftEyeSum / (rightEyeSum || 1);

            // MULTIPLE FACES DETECTOR: Requires two distinct facial skin clusters on BOTH left AND right sides simultaneously
            const isMultipleFaces = (leftSkinCount > 85 && rightSkinCount > 85) &&
                                    (leftSkinCount + rightSkinCount > centerSkinCount * 1.5);

            if (isMultipleFaces) {
              setMultipleFacesDetected(true);
              setFacePresenceStatus('MULTIPLE_FACES');
              setGazeState('LOOKING_LEFT');
              
              if (currentUser) {
                DB.addMonitoringEvent({
                  employeeId: currentUser.employeeId || currentUser.username,
                  employeeName: currentUser.fullName,
                  eventType: 'MULTIPLE_FACES',
                  timestamp: new Date().toLocaleTimeString(),
                  details: '🚨 ALERT: Multiple faces or secondary person detected in camera view!',
                });
              }
            } else {
              setMultipleFacesDetected(false);

              // CONDITION 1: FACE ABSENT
              if (avgCenterLum < 12 || avgCenterVar < 4) {
                setGazeState('FACE_ABSENT');
                setFacePresenceStatus('FACE_ABSENT');
              }
              // CONDITION 2: EYES / HEAD TURNED AWAY FROM DESKTOP SCREEN
              else if (lrRatio > 1.45 || eyeGazeRatio > 1.4) {
                setGazeState('LOOKING_LEFT');
                setFacePresenceStatus('FACE_PRESENT');
              } else if (lrRatio < 0.65 || eyeGazeRatio < 0.7) {
                setGazeState('LOOKING_RIGHT');
                setFacePresenceStatus('FACE_PRESENT');
              }
              // CONDITION 3: DESKTOP SESSION ACTIVE (100% Straight-Forward)
              else {
                setGazeState('STRAIGHT_FORWARD');
                setFacePresenceStatus('FACE_PRESENT');
              }
            }
          }
        }
      }

      animFrame = requestAnimationFrame(analyzeVideoFrame);
    };

    animFrame = requestAnimationFrame(analyzeVideoFrame);

    return () => cancelAnimationFrame(animFrame);
  }, [workStatus, currentUser, setGazeState, setFacePresenceStatus]);

  // LIVE WEBCAM STREAM SETUP (Persistent)
  const startLiveCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      setCameraPermissionGranted(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn('Live camera access note:', err);
      setCameraPermissionGranted(false);
    }
  };

  const stopLiveCameraAndLogoff = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWorkStatus('OFFLINE');
    setFaceVerified(false);

    if (currentUser) {
      DB.addMonitoringEvent({
        employeeId: currentUser.employeeId || currentUser.username,
        employeeName: currentUser.fullName,
        eventType: 'FACE_ABSENT',
        timestamp: new Date().toLocaleTimeString(),
        details: 'Manual log off & camera shutdown executed for session.',
      });
    }

    logout();
    window.location.hash = '#/employee/login';
  };

  useEffect(() => {
    if (!currentUser) return;

    startLiveCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [currentUser]);

  if (!currentUser) return null;

  const getGazeColor = () => {
    if (multipleFacesDetected) return '#ef4444';
    switch (gazeState) {
      case 'STRAIGHT_FORWARD': return '#10b981';
      case 'LOOKING_LEFT':
      case 'LOOKING_RIGHT': return '#f59e0b';
      case 'FACE_ABSENT': return '#ef4444';
      default: return '#10b981';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999,
        background: '#0d1322',
        border: multipleFacesDetected ? '2px solid #ef4444' : gazeState !== 'STRAIGHT_FORWARD' ? '1.5px solid #f59e0b' : '1.5px solid rgba(255, 255, 255, 0.18)',
        borderRadius: '24px',
        padding: expanded ? '20px' : '12px 18px',
        boxShadow: multipleFacesDetected ? '0 0 40px rgba(239, 68, 68, 0.6)' : '0 16px 48px rgba(0, 0, 0, 0.75)',
        color: '#ffffff',
        width: expanded ? '360px' : 'auto',
        maxWidth: 'calc(100vw - 32px)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* PERMANENT HIDDEN / VISIBLE LIVE VIDEO STREAM ELEMENT (Ensures background detection continues even when MINIMIZED!) */}
      <div style={{
        position: expanded ? 'relative' : 'absolute',
        width: expanded ? '100%' : '1px',
        height: expanded ? '180px' : '1px',
        opacity: expanded ? 1 : 0,
        overflow: 'hidden',
        pointerEvents: expanded ? 'auto' : 'none',
        borderRadius: '16px',
        background: '#040711',
        marginBottom: expanded ? '14px' : '0px',
        border: expanded ? `2px solid ${getGazeColor()}` : 'none',
        boxShadow: expanded ? `0 4px 20px ${getGazeColor()}40` : 'none',
        transition: 'all 0.2s ease',
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: 'block',
            filter: gazeState === 'FACE_ABSENT' ? 'grayscale(80%) brightness(0.6)' : 'none'
          }}
        />

        {/* EYE GAZE TRACKER TARGET RETICLES OVERLAY (Shown when expanded) */}
        {expanded && (
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 4,
          }}>
            {/* Left Eye Reticle */}
            <div style={{
              position: 'absolute',
              top: '36%',
              left: gazeState === 'LOOKING_LEFT' ? '28%' : gazeState === 'LOOKING_RIGHT' ? '46%' : '37%',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: `2px solid ${getGazeColor()}`,
              background: `radial-gradient(circle, ${getGazeColor()} 25%, transparent 60%)`,
              boxShadow: `0 0 12px ${getGazeColor()}`,
              transition: 'all 0.2s ease'
            }} />

            {/* Right Eye Reticle */}
            <div style={{
              position: 'absolute',
              top: '36%',
              left: gazeState === 'LOOKING_LEFT' ? '54%' : gazeState === 'LOOKING_RIGHT' ? '72%' : '63%',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: `2px solid ${getGazeColor()}`,
              background: `radial-gradient(circle, ${getGazeColor()} 25%, transparent 60%)`,
              boxShadow: `0 0 12px ${getGazeColor()}`,
              transition: 'all 0.2s ease'
            }} />
          </div>
        )}

        {!cameraPermissionGranted && expanded && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(4, 7, 17, 0.95)',
            padding: '16px',
            textAlign: 'center',
            zIndex: 10
          }}>
            <Camera size={36} color="#34d399" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Live Camera Access Required
            </div>
            <button
              type="button"
              onClick={startLiveCamera}
              className="btn-glow"
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} /> Enable Live Camera
            </button>
          </div>
        )}

        {/* Target Box Corner Brackets */}
        {expanded && (
          <>
            <div style={{ position: 'absolute', top: '10px', left: '10px', width: '16px', height: '16px', borderTop: `2px solid ${getGazeColor()}`, borderLeft: `2px solid ${getGazeColor()}`, zIndex: 2 }} />
            <div style={{ position: 'absolute', top: '10px', right: '10px', width: '16px', height: '16px', borderTop: `2px solid ${getGazeColor()}`, borderRight: `2px solid ${getGazeColor()}`, zIndex: 2 }} />
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '16px', height: '16px', borderBottom: `2px solid ${getGazeColor()}`, borderLeft: `2px solid ${getGazeColor()}`, zIndex: 2 }} />
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '16px', height: '16px', borderBottom: `2px solid ${getGazeColor()}`, borderRight: `2px solid ${getGazeColor()}`, zIndex: 2 }} />
          </>
        )}

        {/* Bottom Screen Focus Badge */}
        {expanded && (
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(14, 21, 38, 0.88)',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#ffffff',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 5
          }}>
            <Compass size={12} color="#60a5fa" />
            SCREEN FOCUS LEVEL: {focusPercentage}%
          </div>
        )}
      </div>

      {/* MINIMIZED & EXPANDED HEADER BAR (Continuous Automatic Status & Time Display) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          gap: '14px'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: getGazeColor(),
              boxShadow: `0 0 10px ${getGazeColor()}`,
              animation: multipleFacesDetected || gazeState !== 'STRAIGHT_FORWARD' ? 'pulse 1s infinite' : 'none'
            }} />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.02em', color: getGazeColor() }}>
            {multipleFacesDetected ? '🚨 MULTIPLE FACES DETECTED' : gazeState === 'STRAIGHT_FORWARD' ? 'DESKTOP SESSION ACTIVE' : gazeState === 'FACE_ABSENT' ? 'NO FACE DETECTED' : '⚠️ GAZE TURNED AWAY'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 800, fontFamily: 'monospace' }}>
            {formatDuration(straightForwardSeconds)}
          </span>

          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8'
          }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </div>
        </div>
      </div>

      {/* Expanded Content Drawer */}
      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {/* MULTIPLE FACES ALERT BANNER */}
          {multipleFacesDetected && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1.5px solid #ef4444',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 800,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'pulse 1s infinite'
            }}>
              <ShieldAlert size={20} color="#ef4444" />
              <span>🚨 ALERT: Second face detected inside camera view!</span>
            </div>
          )}

          {/* GAZE TURNED AWAY BANNER */}
          {gazeState !== 'STRAIGHT_FORWARD' && !multipleFacesDetected && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid #f59e0b',
              color: '#fef08a',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '0.72rem',
              fontWeight: 800,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Eye size={16} color="#f59e0b" />
              <span>⚠️ Gaze turned away $\rightarrow$ Logging Looking Away time ({formatDuration(lookingAwaySeconds)})</span>
            </div>
          )}

          {/* Session Timing Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px', fontSize: '0.72rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '6px 10px', borderRadius: '10px' }}>
              <div style={{ color: '#94a3b8' }}>Login Time</div>
              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.85rem' }}>{loginTime}</div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '6px 10px', borderRadius: '10px' }}>
              <div style={{ color: '#94a3b8' }}>Expected Logout</div>
              <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.85rem' }}>{expectedLogout}</div>
            </div>
          </div>

          {/* Action Buttons: Break & Log Off (Camera Off) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); toggleBreak(); }}
              className={workStatus === 'BREAK' ? 'btn-glow' : 'btn-secondary'}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px 12px' }}
            >
              {workStatus === 'BREAK' ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
              {workStatus === 'BREAK' ? 'Resume' : 'Take Break'}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); stopLiveCameraAndLogoff(); }}
              className="btn-danger"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px 12px', borderRadius: '30px' }}
            >
              <LogOut size={14} /> Log Off (Cam Off)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
