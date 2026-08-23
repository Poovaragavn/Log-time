import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { useWorkSession } from '../context/WorkSessionContext';
import { useAuth } from '../context/AuthContext';
import { DB } from '../services/db';
import {
  PauseCircle, PlayCircle, Camera, RefreshCw, Compass,
  ShieldAlert, LogOut, Eye, ChevronUp, ChevronDown,
  ShieldCheck, AlertTriangle, Loader
} from 'lucide-react';

const MODELS_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/models';
const SESSION_MATCH_THRESHOLD = 0.52;
const MISMATCH_LOGOUT_COUNT = 8;
const BIOMETRIC_CHECK_INTERVAL_MS = 1800;

type BiometricSessionState = 'LOADING_MODELS' | 'LOADING_PROFILE' | 'MONITORING' | 'MISMATCH_WARNING' | 'INTRUDER_LOGOUT';
export const MonitoringWidget: React.FC = () => {
  const { currentUser, currentEmployee, logout } = useAuth();
  const {
    workStatus, setWorkStatus, toggleBreak, formatDuration,
    straightForwardSeconds, lookingAwaySeconds, gazeState,
    setGazeState, setFacePresenceStatus, loginTime, expectedLogout,
    focusPercentage, setFaceVerified,
  } = useWorkSession();

  const [expanded, setExpanded] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const [multipleFacesDetected, setMultipleFacesDetected] = useState(false);

  const [biometricState, setBiometricState] = useState<BiometricSessionState>('LOADING_MODELS');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [enrolledReady, setEnrolledReady] = useState(false);
  const [mismatchCount, setMismatchCount] = useState(0);
  const [logoutCountdown, setLogoutCountdown] = useState(10);
  const [lastMatchScore, setLastMatchScore] = useState<number | null>(null);
  const [biometricStatusMsg, setBiometricStatusMsg] = useState('Loading AI models...');

  const enrolledDescriptorRef = useRef<Float32Array | null>(null);
  const consecutiveMismatchRef = useRef(0);
  const bioScanLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logoutTriggeredRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Authoritative face-presence flag updated by face-api biometric scan
  const bioFaceDetectedRef = useRef(true);

  // 1. Load face-api models
  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      try {
        setBiometricStatusMsg('Loading face recognition AI models...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);
        if (!cancelled) {
          setModelsLoaded(true);
          setBiometricState('LOADING_PROFILE');
          setBiometricStatusMsg('AI ready. Loading enrolled face...');
        }
      } catch (err) {
        console.error('face-api model load error:', err);
        if (!cancelled) setBiometricStatusMsg('Failed to load AI models. Guard inactive.');
      }
    }
    loadModels();
    return () => { cancelled = true; };
  }, []);

  // 2. Extract enrolled face descriptor
  useEffect(() => {
    if (!modelsLoaded) return;
    const emp = currentEmployee || DB.getEmployees().find(e =>
      e.employeeId === currentUser?.employeeId ||
      e.username?.toLowerCase() === currentUser?.username?.toLowerCase()
    );
    const uri = emp?.faceImageUri || '/enrolled_face.jpg';
    enrolledDescriptorRef.current = null;
    setEnrolledReady(false);

    async function extract(u: string) {
      try {
        const img = await faceapi.fetchImage(u);
        const det = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.2 }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();
        if (det) {
          enrolledDescriptorRef.current = det.descriptor;
          setEnrolledReady(true);
          setBiometricState('MONITORING');
          setBiometricStatusMsg('Biometric guard active');
        } else {
          if (u !== '/enrolled_face.jpg') await extract('/enrolled_face.jpg');
          else { setBiometricStatusMsg('No face profile. Guard inactive.'); setBiometricState('MONITORING'); }
        }
      } catch {
        if (u !== '/enrolled_face.jpg') await extract('/enrolled_face.jpg');
        else setBiometricState('MONITORING');
      }
    }
    extract(uri);
  }, [modelsLoaded, currentEmployee, currentUser]);

  // 3. Biometric scan callback
  const runBiometricScan = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !modelsLoaded || !enrolledDescriptorRef.current) return;
    if (biometricState !== 'MONITORING') return;
    if (logoutTriggeredRef.current) return;

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 }))
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      // No face in frame — ensure looking-away timer is counted
      consecutiveMismatchRef.current = 0;
      bioFaceDetectedRef.current = false;  // tells pixel gaze to force FACE_ABSENT
      setGazeState('FACE_ABSENT');
      setFacePresenceStatus('FACE_ABSENT');
      setBiometricStatusMsg('No face detected — looking away time recorded');
      return;
    }
    // Face present — allow pixel-based gaze direction to run normally
    bioFaceDetectedRef.current = true;

    const live = detection.descriptor;
    const enrolled = enrolledDescriptorRef.current;
    let sumSq = 0;
    for (let i = 0; i < 128; i++) { const d = live[i] - enrolled[i]; sumSq += d * d; }
    const dist = Math.sqrt(sumSq);
    const displayScore = Math.max(0, Math.min(100, Math.round((1 - dist) * 100)));
    setLastMatchScore(displayScore);
    const isMatch = dist < SESSION_MATCH_THRESHOLD;

    if (isMatch) {
      consecutiveMismatchRef.current = 0;
      setMismatchCount(0);
      setBiometricStatusMsg('Identity confirmed: ' + displayScore + '% match');
    } else {
      consecutiveMismatchRef.current += 1;
      setMismatchCount(consecutiveMismatchRef.current);
      setBiometricStatusMsg('IDENTITY MISMATCH: ' + displayScore + '% - Unknown face');
      if (currentUser) {
        DB.addMonitoringEvent({
          employeeId: currentUser.employeeId || currentUser.username,
          employeeName: currentUser.fullName,
          eventType: 'LIVENESS_FAILED',
          timestamp: new Date().toLocaleTimeString(),
          details: 'Biometric mismatch! Score: ' + displayScore + '%. Consecutive: ' + consecutiveMismatchRef.current,
        });
      }
      if (consecutiveMismatchRef.current >= MISMATCH_LOGOUT_COUNT) {
        if (bioScanLoopRef.current) clearInterval(bioScanLoopRef.current);
        setBiometricState('INTRUDER_LOGOUT');
        startLogoutCountdown();
      } else {
        setBiometricState('MISMATCH_WARNING');
        setTimeout(() => {
          if (consecutiveMismatchRef.current < MISMATCH_LOGOUT_COUNT) setBiometricState('MONITORING');
        }, 2000);
      }
    }
  }, [modelsLoaded, biometricState, currentUser, setGazeState, setFacePresenceStatus]);

  // 4. Start/stop biometric scan loop
  useEffect(() => {
    if (!modelsLoaded || !enrolledReady || workStatus !== 'ACTIVE') {
      if (bioScanLoopRef.current) { clearInterval(bioScanLoopRef.current); bioScanLoopRef.current = null; }
      return;
    }
    if (biometricState !== 'MONITORING' && biometricState !== 'MISMATCH_WARNING') return;
    if (bioScanLoopRef.current) clearInterval(bioScanLoopRef.current);
    bioScanLoopRef.current = setInterval(runBiometricScan, BIOMETRIC_CHECK_INTERVAL_MS);
    return () => { if (bioScanLoopRef.current) clearInterval(bioScanLoopRef.current); };
  }, [modelsLoaded, enrolledReady, workStatus, biometricState, runBiometricScan]);

  // 5. Logout countdown
  const startLogoutCountdown = () => {
    logoutTriggeredRef.current = true;
    setLogoutCountdown(10);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setLogoutCountdown(prev => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          performAutoLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const performAutoLogout = () => {
    if (currentUser) {
      DB.addMonitoringEvent({
        employeeId: currentUser.employeeId || currentUser.username,
        employeeName: currentUser.fullName,
        eventType: 'LIVENESS_FAILED',
        timestamp: new Date().toLocaleTimeString(),
        details: 'AUTO-LOGOUT: Biometric identity failed. Unrecognized face. Session terminated.',
      });
    }
    stopLiveCameraAndLogoff();
  };

  // 6. Activity detector
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      if (workStatus === 'IDLE') {
        setWorkStatus('ACTIVE');
        if (currentUser) {
          DB.addMonitoringEvent({ employeeId: currentUser.employeeId || currentUser.username, employeeName: currentUser.fullName, eventType: 'FACE_PRESENT', timestamp: new Date().toLocaleTimeString(), details: 'Workstation activity detected for ' + currentUser.role });
        }
      }
    };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    return () => { window.removeEventListener('mousemove', handleActivity); window.removeEventListener('keydown', handleActivity); window.removeEventListener('touchstart', handleActivity); };
  }, [workStatus, currentUser, setWorkStatus]);

  // 7. Idle check
  useEffect(() => {
    const settings = DB.getSettings();
    const thresholdMs = (settings.idleThresholdSeconds || 300) * 1000;
    const interval = setInterval(() => {
      if (workStatus === 'ACTIVE' && Date.now() - lastActivity > thresholdMs) setWorkStatus('IDLE');
    }, 5000);
    return () => clearInterval(interval);
  }, [lastActivity, workStatus, currentUser, setWorkStatus]);

  // 8. Pixel-based gaze detection
  useEffect(() => {
    if (workStatus !== 'ACTIVE') return;
    let animFrame: number;
    let lastTime = 0;
    const analyzeVideoFrame = (timestamp: number) => {
      if (timestamp - lastTime > 250) {
        lastTime = timestamp;
        if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            canvas.width = 160; canvas.height = 120;
            ctx.drawImage(video, 0, 0, 160, 120);
            const frame = ctx.getImageData(0, 0, 160, 120);
            const data = frame.data;
            let centerSum = 0, centerVarianceSum = 0, leftEyeSum = 0, rightEyeSum = 0;
            let leftSum = 0, rightSum = 0, centerCount = 0, leftCount = 0, rightCount = 0;
            let leftSkinCount = 0, centerSkinCount = 0, rightSkinCount = 0;
            for (let y = 20; y < 100; y += 2) {
              for (let x = 10; x < 150; x += 2) {
                const idx = (y * 160 + x) * 4;
                const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                const varColor = Math.abs(r - g) + Math.abs(g - b);
                const isSkin = (r > 40) && (g > 20) && (b > 15) && (r > b) && ((r - Math.min(g, b)) > 15) && (Math.abs(r - g) < 70);
                if (isSkin) { if (x < 45) leftSkinCount++; else if (x > 115) rightSkinCount++; else centerSkinCount++; }
                if (y >= 25 && y <= 55) { if (x >= 40 && x < 80) leftEyeSum += lum; if (x >= 80 && x <= 120) rightEyeSum += lum; }
                if (x >= 45 && x <= 115 && y >= 25 && y <= 95) { centerSum += lum; centerCount++; centerVarianceSum += varColor; }
                else if (x < 45) { leftSum += lum; leftCount++; }
                else if (x > 115) { rightSum += lum; rightCount++; }
              }
            }
            const avgCenterLum = centerCount > 0 ? centerSum / centerCount : 0;
            const avgCenterVar = centerCount > 0 ? centerVarianceSum / centerCount : 0;
            const avgLeftLum = leftCount > 0 ? leftSum / leftCount : 1;
            const avgRightLum = rightCount > 0 ? rightSum / rightCount : 1;
            const lrRatio = avgLeftLum / avgRightLum;
            const eyeGazeRatio = leftEyeSum / (rightEyeSum || 1);
            const isMultipleFaces = (leftSkinCount > 85 && rightSkinCount > 85) && (leftSkinCount + rightSkinCount > centerSkinCount * 1.5);
            if (isMultipleFaces) {
              setMultipleFacesDetected(true); setFacePresenceStatus('MULTIPLE_FACES'); setGazeState('LOOKING_LEFT');
              if (currentUser) DB.addMonitoringEvent({ employeeId: currentUser.employeeId || currentUser.username, employeeName: currentUser.fullName, eventType: 'MULTIPLE_FACES', timestamp: new Date().toLocaleTimeString(), details: 'ALERT: Multiple faces detected!' });
            } else {
              setMultipleFacesDetected(false);
              // If face-api biometric scan confirmed no face, force FACE_ABSENT
              // regardless of background pixel brightness (fixes looking-away timer bug)
              if (!bioFaceDetectedRef.current) {
                setGazeState('FACE_ABSENT');
                setFacePresenceStatus('FACE_ABSENT');
              } else if (avgCenterLum < 12 || avgCenterVar < 4) {
                setGazeState('FACE_ABSENT'); setFacePresenceStatus('FACE_ABSENT');
              } else if (lrRatio > 1.45 || eyeGazeRatio > 1.4) {
                setGazeState('LOOKING_LEFT'); setFacePresenceStatus('FACE_PRESENT');
              } else if (lrRatio < 0.65 || eyeGazeRatio < 0.7) {
                setGazeState('LOOKING_RIGHT'); setFacePresenceStatus('FACE_PRESENT');
              } else {
                setGazeState('STRAIGHT_FORWARD'); setFacePresenceStatus('FACE_PRESENT');
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

  // 9. Camera setup
  const startLiveCamera = async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      setCameraPermissionGranted(true);
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch (err) { console.warn('Camera error:', err); setCameraPermissionGranted(false); }
  };

  const stopLiveCameraAndLogoff = () => {
    if (bioScanLoopRef.current) clearInterval(bioScanLoopRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => { t.stop(); t.enabled = false; }); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setWorkStatus('OFFLINE');
    setFaceVerified(false);
    if (currentUser) DB.addMonitoringEvent({ employeeId: currentUser.employeeId || currentUser.username, employeeName: currentUser.fullName, eventType: 'FACE_ABSENT', timestamp: new Date().toLocaleTimeString(), details: 'Session terminated - camera shutdown.' });
    logout();
    window.location.hash = '#/employee/login';
  };

  useEffect(() => {
    if (!currentUser) return;
    startLiveCamera();
    return () => {
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => { t.stop(); t.enabled = false; }); streamRef.current = null; }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [currentUser]);

  if (!currentUser) return null;

  const getGazeColor = () => {
    if (multipleFacesDetected) return '#ef4444';
    if (biometricState === 'INTRUDER_LOGOUT' || biometricState === 'MISMATCH_WARNING') return '#ef4444';
    switch (gazeState) {
      case 'STRAIGHT_FORWARD': return '#10b981';
      case 'LOOKING_LEFT': case 'LOOKING_RIGHT': return '#f59e0b';
      case 'FACE_ABSENT': return '#ef4444';
      default: return '#10b981';
    }
  };

  const isIntruderAlert = biometricState === 'INTRUDER_LOGOUT' || biometricState === 'MISMATCH_WARNING';
  const isBiometricOk = biometricState === 'MONITORING' && enrolledReady;

  const headerLabel = () => {
    if (biometricState === 'INTRUDER_LOGOUT') return 'IDENTITY MISMATCH - LOGOUT IN ' + logoutCountdown + 's';
    if (biometricState === 'MISMATCH_WARNING') return 'FACE MISMATCH DETECTED';
    if (biometricState === 'LOADING_MODELS' || biometricState === 'LOADING_PROFILE') return 'LOADING BIOMETRIC AI...';
    if (multipleFacesDetected) return 'MULTIPLE FACES DETECTED';
    if (gazeState === 'STRAIGHT_FORWARD') return 'DESKTOP SESSION ACTIVE';
    if (gazeState === 'FACE_ABSENT') return 'NO FACE DETECTED';
    return 'GAZE TURNED AWAY';
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999, background: '#0d1322', border: isIntruderAlert ? '2px solid #ef4444' : multipleFacesDetected ? '2px solid #ef4444' : gazeState !== 'STRAIGHT_FORWARD' ? '1.5px solid #f59e0b' : '1.5px solid rgba(255,255,255,0.18)', borderRadius: '24px', padding: expanded ? '20px' : '12px 18px', boxShadow: isIntruderAlert ? '0 0 50px rgba(239,68,68,0.8)' : multipleFacesDetected ? '0 0 40px rgba(239,68,68,0.6)' : '0 16px 48px rgba(0,0,0,0.75)', color: '#ffffff', width: expanded ? '380px' : 'auto', maxWidth: 'calc(100vw - 32px)', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {biometricState === 'INTRUDER_LOGOUT' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.93)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px', textAlign: 'center' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', border: '3px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={52} color="#ef4444" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ef4444' }}>IDENTITY MISMATCH</div>
          <div style={{ fontSize: '1.05rem', color: '#ffffff', maxWidth: '480px', lineHeight: 1.6 }}>
            The face in front of the camera does <strong style={{ color: '#ef4444' }}>NOT match</strong> the enrolled profile of <strong>{currentUser.fullName}</strong>.
          </div>
          <div style={{ fontSize: '4.5rem', fontWeight: 900, color: '#f87171', fontFamily: 'monospace', textShadow: '0 0 30px rgba(239,68,68,0.8)' }}>{logoutCountdown}</div>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Session will be automatically terminated for security.</div>
          {lastMatchScore !== null && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '12px', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#fca5a5' }}>
              Biometric Score: {lastMatchScore}% (Required: &ge;{Math.round((1 - SESSION_MATCH_THRESHOLD) * 100)}%)
            </div>
          )}
          <button onClick={performAutoLogout} style={{ background: 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)', border: 'none', color: '#fff', padding: '14px 32px', borderRadius: '16px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={20} /> Log Out Now
          </button>
        </div>
      )}

      <div style={{ position: expanded ? 'relative' : 'absolute', width: expanded ? '100%' : '1px', height: expanded ? '180px' : '1px', opacity: expanded ? 1 : 0, overflow: 'hidden', pointerEvents: expanded ? 'auto' : 'none', borderRadius: '16px', background: '#040711', marginBottom: expanded ? '14px' : '0px', border: expanded ? '2px solid ' + getGazeColor() : 'none', boxShadow: expanded ? '0 4px 20px ' + getGazeColor() + '40' : 'none', transition: 'all 0.2s ease' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block', filter: gazeState === 'FACE_ABSENT' ? 'grayscale(80%) brightness(0.6)' : 'none' }} />

        {expanded && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
            {(['37%', '63%'] as const).map((_defaultLeft, i) => {
              const left = i === 0
                ? (gazeState === 'LOOKING_LEFT' ? '28%' : gazeState === 'LOOKING_RIGHT' ? '46%' : '37%')
                : (gazeState === 'LOOKING_LEFT' ? '54%' : gazeState === 'LOOKING_RIGHT' ? '72%' : '63%');
              return <div key={i} style={{ position: 'absolute', top: '36%', left, width: '24px', height: '24px', borderRadius: '50%', border: '2px solid ' + getGazeColor(), background: 'radial-gradient(circle,' + getGazeColor() + ' 25%,transparent 60%)', boxShadow: '0 0 12px ' + getGazeColor(), transition: 'all 0.2s ease' }} />;
            })}
          </div>
        )}

        {!cameraPermissionGranted && expanded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,7,17,0.95)', padding: '16px', textAlign: 'center', zIndex: 10 }}>
            <Camera size={36} color="#34d399" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>Live Camera Access Required</div>
            <button type="button" onClick={startLiveCamera} className="btn-glow" style={{ padding: '8px 16px', fontSize: '0.8rem' }}><RefreshCw size={14} /> Enable Live Camera</button>
          </div>
        )}

        {expanded && (
          <>
            <div style={{ position: 'absolute', top: '10px', left: '10px', width: '16px', height: '16px', borderTop: '2px solid ' + getGazeColor(), borderLeft: '2px solid ' + getGazeColor(), zIndex: 2 }} />
            <div style={{ position: 'absolute', top: '10px', right: '10px', width: '16px', height: '16px', borderTop: '2px solid ' + getGazeColor(), borderRight: '2px solid ' + getGazeColor(), zIndex: 2 }} />
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '16px', height: '16px', borderBottom: '2px solid ' + getGazeColor(), borderLeft: '2px solid ' + getGazeColor(), zIndex: 2 }} />
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '16px', height: '16px', borderBottom: '2px solid ' + getGazeColor(), borderRight: '2px solid ' + getGazeColor(), zIndex: 2 }} />
          </>
        )}

        {expanded && (
          <div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', background: isIntruderAlert ? 'rgba(239,68,68,0.9)' : isBiometricOk ? 'rgba(16,185,129,0.85)' : 'rgba(9,13,22,0.85)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 800, color: '#ffffff', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', zIndex: 10 }}>
            {(biometricState === 'LOADING_MODELS' || biometricState === 'LOADING_PROFILE') ? <><Loader size={10} /> Loading AI...</> : isIntruderAlert ? <><ShieldAlert size={10} /> IDENTITY MISMATCH</> : isBiometricOk ? <><ShieldCheck size={10} /> BIOMETRIC GUARD ACTIVE</> : <><Eye size={10} /> GUARD INACTIVE</>}
            {lastMatchScore !== null && isBiometricOk && <span style={{ marginLeft: '4px', opacity: 0.85 }}>&middot; {lastMatchScore}%</span>}
          </div>
        )}

        {expanded && (
          <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(14,21,38,0.88)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 5 }}>
            <Compass size={12} color="#60a5fa" />SCREEN FOCUS: {focusPercentage}%
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '14px' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: getGazeColor(), boxShadow: '0 0 10px ' + getGazeColor() }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.02em', color: getGazeColor() }}>
            {biometricState === 'INTRUDER_LOGOUT' ? '🔒 ' : biometricState === 'MISMATCH_WARNING' ? '🚨 ' : multipleFacesDetected ? '🚨 ' : ''}{headerLabel()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 800, fontFamily: 'monospace' }}>{formatDuration(straightForwardSeconds)}</span>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ background: isIntruderAlert ? 'rgba(239,68,68,0.25)' : isBiometricOk ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', border: '1.5px solid ' + (isIntruderAlert ? '#ef4444' : isBiometricOk ? '#10b981' : '#6366f1'), color: '#ffffff', padding: '8px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(biometricState === 'LOADING_MODELS' || biometricState === 'LOADING_PROFILE') ? <><Loader size={14} color="#6366f1" /><span>{biometricStatusMsg}</span></> : isIntruderAlert ? <><ShieldAlert size={14} color="#ef4444" /><span>{biometricStatusMsg}</span></> : isBiometricOk ? <><ShieldCheck size={14} color="#10b981" /><span>{biometricStatusMsg}</span></> : <><Eye size={14} color="#6366f1" /><span>{biometricStatusMsg}</span></>}
            {mismatchCount > 0 && mismatchCount < MISMATCH_LOGOUT_COUNT && (
              <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '8px', color: '#fca5a5', fontSize: '0.7rem' }}>{mismatchCount}/{MISMATCH_LOGOUT_COUNT}</span>
            )}
          </div>

          {multipleFacesDetected && (
            <div style={{ background: 'rgba(239,68,68,0.25)', border: '1.5px solid #ef4444', color: '#ffffff', padding: '8px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} color="#ef4444" /><span>ALERT: Second face detected in camera view!</span>
            </div>
          )}

          {gazeState !== 'STRAIGHT_FORWARD' && !multipleFacesDetected && !isIntruderAlert && (
            <div style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid #f59e0b', color: '#fef08a', padding: '6px 12px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={16} color="#f59e0b" /><span>Gaze turned away &mdash; {formatDuration(lookingAwaySeconds)}</span>
            </div>
          )}

          {biometricState === 'MISMATCH_WARNING' && (
            <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '6px 12px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} color="#ef4444" /><span>Unrecognized face! Verifying identity...</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px', fontSize: '0.72rem' }}>
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: '10px' }}>
              <div style={{ color: '#94a3b8' }}>Login Time</div>
              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.85rem' }}>{loginTime}</div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: '10px' }}>
              <div style={{ color: '#94a3b8' }}>Expected Logout</div>
              <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.85rem' }}>{expectedLogout}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button onClick={(e) => { e.stopPropagation(); toggleBreak(); }} className={workStatus === 'BREAK' ? 'btn-glow' : 'btn-secondary'} style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px 12px' }}>
              {workStatus === 'BREAK' ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
              {workStatus === 'BREAK' ? 'Resume' : 'Take Break'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); stopLiveCameraAndLogoff(); }} className="btn-danger" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px 12px', borderRadius: '30px' }}>
              <LogOut size={14} /> Log Off
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
