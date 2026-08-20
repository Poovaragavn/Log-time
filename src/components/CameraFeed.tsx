import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { CheckCircle, AlertTriangle, RefreshCw, ShieldCheck, SwitchCamera, Focus, UserCheck, ShieldAlert, Loader } from 'lucide-react';

interface CameraFeedProps {
  mode: 'ENROLL' | 'VERIFY';
  targetName?: string;
  targetFaceUri?: string;
  onSuccess: (faceDescriptor: string, capturedImageUri?: string) => void;
  onFailure?: (reason: string) => void;
  maxAttempts?: number;
}

const MODELS_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/models';
// Euclidean distance threshold: <0.50 = same person, >0.50 = different
const MATCH_THRESHOLD = 0.50;

export const CameraFeed: React.FC<CameraFeedProps> = ({
  mode,
  targetName = 'Employee',
  targetFaceUri = '',
  onSuccess,
  onFailure,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const consecutiveMatchRef = useRef(0);
  const consecutiveFailRef = useRef(0);
  const scanLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const [verifyingState, setVerifyingState] = useState<'LOADING' | 'INITIALIZING' | 'ALIGNING' | 'SUCCESS' | 'FAILED'>('LOADING');
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [faceDetected, setFaceDetected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Loading face recognition AI models...');
  const [matchScore, setMatchScore] = useState<number | null>(null);

  const enrolledDescriptorRef = useRef<Float32Array | null>(null);
  const [enrolledReady, setEnrolledReady] = useState(false);

  // Load face-api.js models
  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      try {
        setStatusMessage('Loading face recognition AI models...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);
        if (!cancelled) {
          setModelsLoaded(true);
          setVerifyingState('INITIALIZING');
          setStatusMessage('AI models ready. Initializing camera...');
        }
      } catch (err) {
        console.error('face-api model load error:', err);
        if (!cancelled) setStatusMessage('Failed to load AI models. Please refresh the page.');
      }
    }
    loadModels();
    return () => { cancelled = true; };
  }, []);

  // Extract enrolled face descriptor from database photo
  useEffect(() => {
    if (!modelsLoaded || mode === 'ENROLL') return;
    enrolledDescriptorRef.current = null;
    setEnrolledReady(false);
    const uri = targetFaceUri || '/enrolled_face.jpg';
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
          setStatusMessage('Face profile loaded. Look at the camera.');
        } else {
          if (u !== '/enrolled_face.jpg') await extract('/enrolled_face.jpg');
          else setStatusMessage('Could not extract face from profile photo. Please re-enroll.');
        }
      } catch {
        if (u !== '/enrolled_face.jpg') await extract('/enrolled_face.jpg');
      }
    }
    extract(uri);
  }, [modelsLoaded, mode, targetFaceUri, targetName]);

  // Enumerate cameras
  useEffect(() => {
    async function getDevices() {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const vids = devices.filter(d => d.kind === 'videoinput');
          setAvailableDevices(vids);
          if (vids.length > 0 && !selectedDeviceId) setSelectedDeviceId(vids[0].deviceId);
        }
      } catch { /**/ }
    }
    getDevices();
  }, [selectedDeviceId]);

  // Start webcam stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function initCamera() {
      try {
        let videoConstraints: boolean | MediaTrackConstraints = { facingMode, width: { ideal: 640 }, height: { ideal: 480 } };
        if (selectedDeviceId) {
          videoConstraints = { deviceId: { exact: selectedDeviceId } };
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
        } catch {
          // Mobile camera fallback if resolution constraints are not supported
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        }
        if (videoRef.current) { videoRef.current.srcObject = stream; setStreamActive(true); }
      } catch (err) {
        console.error('Camera init error:', err);
        setStreamActive(false);
        setStatusMessage('Camera access denied or unavailable. Please allow camera permission.');
      }
    }
    initCamera();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [selectedDeviceId, facingMode]);

  // Countdown timer
  useEffect(() => {
    if (verifyingState === 'SUCCESS' || verifyingState === 'FAILED' || verifyingState === 'LOADING') return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setVerifyingState('FAILED');
          setStatusMessage('Verification timeout. Please retry.');
          if (onFailure) onFailure('Biometric verification timeout exceeded');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [verifyingState, targetName, onFailure]);

  // Biometric scan loop
  const runScan = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !modelsLoaded) return;

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 }))
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      setFaceDetected(false);
      consecutiveMatchRef.current = 0;
      setLivenessProgress(0);
      setStatusMessage('No face detected. Center your face in the frame.');
      return;
    }
    setFaceDetected(true);

    if (mode === 'ENROLL') {
      consecutiveMatchRef.current += 1;
      setStatusMessage('Face detected! Hold still to capture...');
      setLivenessProgress(prev => {
        const next = Math.min(100, prev + 25);
        if (next >= 100 && scanLoopRef.current) {
          clearInterval(scanLoopRef.current);
          setVerifyingState('SUCCESS');
          const snap = document.createElement('canvas');
          snap.width = video.videoWidth || 320;
          snap.height = video.videoHeight || 240;
          const ctx = snap.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const uri = snap.toDataURL('image/jpeg', 0.9);
            setStatusMessage('Face captured successfully!');
            setTimeout(() => onSuccess('descriptor_' + Date.now(), uri), 200);
          }
        }
        return next;
      });
      return;
    }

    // VERIFY mode: compare live descriptor vs enrolled descriptor
    if (!enrolledDescriptorRef.current) {
      setStatusMessage('No face profile found for ' + targetName + '.');
      return;
    }

    const live = detection.descriptor;
    const enrolled = enrolledDescriptorRef.current;
    let sumSq = 0;
    for (let i = 0; i < 128; i++) {
      const d = live[i] - enrolled[i];
      sumSq += d * d;
    }
    const dist = Math.sqrt(sumSq);
    const displayScore = Math.max(0, Math.min(100, Math.round((1 - dist) * 100)));
    setMatchScore(displayScore);

    const isMatch = dist < MATCH_THRESHOLD;

    if (isMatch) {
      consecutiveFailRef.current = 0;
      consecutiveMatchRef.current += 1;
      setStatusMessage('Face recognized: ' + displayScore + '% match. Hold still...');
      setLivenessProgress(prev => {
        const next = Math.min(100, prev + 25);
        if (next >= 100 && scanLoopRef.current) {
          clearInterval(scanLoopRef.current);
          setVerifyingState('SUCCESS');
          setStatusMessage('Biometric Verified! Welcome, ' + targetName + '!');
          setTimeout(() => onSuccess('verified_' + Date.now() + '_' + targetName), 200);
        }
        return next;
      });
    } else {
      consecutiveMatchRef.current = 0;
      consecutiveFailRef.current += 1;
      setLivenessProgress(0);
      setStatusMessage('Access Denied: ' + displayScore + '% — does NOT match ' + targetName + '\'s profile.');
      if (consecutiveFailRef.current >= 5 && scanLoopRef.current) {
        clearInterval(scanLoopRef.current);
        setVerifyingState('FAILED');
        setStatusMessage('BIOMETRIC MISMATCH: Unauthorized face. Access Denied.');
        if (onFailure) onFailure('Face does not match enrolled profile for ' + targetName);
      }
    }
  }, [modelsLoaded, mode, targetName, onSuccess, onFailure]);

  // Start scan loop when ALIGNING
  useEffect(() => {
    if (!modelsLoaded || !streamActive || verifyingState !== 'ALIGNING') return;
    if (mode === 'VERIFY' && !enrolledReady) return;
    if (scanLoopRef.current) clearInterval(scanLoopRef.current);
    consecutiveMatchRef.current = 0;
    consecutiveFailRef.current = 0;
    scanLoopRef.current = setInterval(runScan, 350);
    return () => { if (scanLoopRef.current) clearInterval(scanLoopRef.current); };
  }, [modelsLoaded, streamActive, verifyingState, enrolledReady, mode, runScan]);

  // Warmup transition from INITIALIZING to ALIGNING
  useEffect(() => {
    if (verifyingState !== 'INITIALIZING' || !modelsLoaded || !streamActive) return;
    const t = setTimeout(() => {
      setVerifyingState('ALIGNING');
      setStatusMessage('Look at the camera for face verification...');
    }, 2000);
    return () => clearTimeout(t);
  }, [verifyingState, modelsLoaded, streamActive]);

  // Overlay canvas animation
  useEffect(() => {
    let animId: number;
    const draw = () => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2, cy = canvas.height / 2;
      const rx = 110, ry = 140;
      const col = verifyingState === 'SUCCESS' ? '#10b981'
        : verifyingState === 'FAILED' ? '#ef4444'
        : faceDetected ? '#34d399' : '#f59e0b';

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);

      const off = 20;
      ctx.strokeStyle = col; ctx.lineWidth = 4;
      [[cx-rx-off, cy-ry, cx-rx-off, cy-ry-off, cx-rx, cy-ry-off],
       [cx+rx, cy-ry-off, cx+rx+off, cy-ry-off, cx+rx+off, cy-ry]].forEach((p: number[]) => {
        ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(p[2],p[3]); ctx.lineTo(p[4],p[5]); ctx.stroke();
      });

      if (faceDetected && verifyingState === 'ALIGNING') {
        const t2 = Date.now() / 500;
        const scanY = cy + Math.sin(t2) * (ry * 0.85);
        const g = ctx.createLinearGradient(cx-rx, scanY, cx+rx, scanY);
        g.addColorStop(0, 'rgba(16,185,129,0)');
        g.addColorStop(0.5, 'rgba(16,185,129,0.9)');
        g.addColorStop(1, 'rgba(16,185,129,0)');
        ctx.beginPath(); ctx.moveTo(cx-rx, scanY); ctx.lineTo(cx+rx, scanY);
        ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.stroke();

        const pts = [{x:cx-35,y:cy-28},{x:cx+35,y:cy-28},{x:cx,y:cy+2},{x:cx-25,y:cy+45},{x:cx+25,y:cy+45}];
        ctx.fillStyle = '#34d399';
        pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x,p.y,4,0,2*Math.PI); ctx.fill(); });
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [verifyingState, faceDetected]);

  const handleRetry = () => {
    if (scanLoopRef.current) clearInterval(scanLoopRef.current);
    consecutiveMatchRef.current = 0;
    consecutiveFailRef.current = 0;
    setTimeRemaining(90); setLivenessProgress(0); setMatchScore(null);
    setFaceDetected(false); setVerifyingState('INITIALIZING');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px', width: '100%' }}>

      {verifyingState === 'LOADING' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6', fontWeight: 800,
          fontSize: '0.85rem', marginBottom: '12px', padding: '12px 20px',
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '16px', width: '100%', maxWidth: '360px', justifyContent: 'center'
        }}>
          <Loader size={16} /> Loading face recognition AI...
        </div>
      )}

      {mode === 'VERIFY' && targetFaceUri && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.1)',
          padding: '8px 14px', borderRadius: '16px',
          marginBottom: '12px', width: '100%', maxWidth: '360px', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={targetFaceUri} alt={targetName}
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981' }} />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Enrolled Profile:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{targetName}</div>
            </div>
          </div>
          <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
            <UserCheck size={12} /> AI FACE MATCH
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', width: '100%', maxWidth: '360px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#0f172a', fontWeight: 800 }}>
          <ShieldCheck size={16} color="#059669" />
          {mode === 'ENROLL' ? 'Live Face Capture' : 'AI Biometric Verification'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: timeRemaining <= 10 ? 'rgba(239,68,68,0.15)' : 'rgba(15,23,42,0.08)',
            color: timeRemaining <= 10 ? '#ef4444' : '#0f172a',
            padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, fontFamily: 'monospace'
          }}>
            {String.fromCodePoint(0x23F1)} {timeRemaining}s
          </div>
          {availableDevices.length > 0 && (
            <select value={selectedDeviceId} onChange={e => setSelectedDeviceId(e.target.value)}
              style={{ width: '100px', padding: '4px 6px', fontSize: '0.72rem', borderRadius: '10px', background: 'rgba(15,23,42,0.05)', border: '1px solid rgba(15,23,42,0.15)', fontWeight: 700 }}>
              {availableDevices.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || 'Cam ' + (i+1)}</option>)}
            </select>
          )}
          <button type="button" onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')}
            className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '12px' }}>
            <SwitchCamera size={14} />
          </button>
        </div>
      </div>

      <div style={{
        position: 'relative', width: '100%', maxWidth: '360px', height: '270px',
        borderRadius: '24px', overflow: 'hidden', background: '#070a14',
        border: '3px solid ' + (verifyingState === 'SUCCESS' ? '#10b981' : verifyingState === 'FAILED' ? '#ef4444' : faceDetected ? '#34d399' : '#f59e0b'),
        boxShadow: verifyingState === 'SUCCESS' ? '0 0 30px rgba(16,185,129,0.4)' : verifyingState === 'FAILED' ? '0 0 30px rgba(239,68,68,0.4)' : '0 12px 36px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease',
      }}>
        <video ref={videoRef} autoPlay playsInline muted
          style={{ width: '100%', height: '100%', objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            display: streamActive ? 'block' : 'none' }} />
        {!streamActive && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16' }}>
            <img src={targetFaceUri || '/enrolled_face.jpg'} alt={targetName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.9)' }} />
          </div>
        )}
        <canvas ref={overlayCanvasRef} width={360} height={270}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

        <div style={{
          position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
          background: verifyingState === 'FAILED' ? 'rgba(220,38,38,0.95)' : 'rgba(9,13,22,0.88)',
          padding: '6px 14px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800,
          color: verifyingState === 'SUCCESS' ? '#34d399' : verifyingState === 'FAILED' ? '#fff' : faceDetected ? '#fff' : '#f87171',
          backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)',
          whiteSpace: 'nowrap', zIndex: 10, display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '90%'
        }}>
          {verifyingState === 'SUCCESS' ? <CheckCircle size={14} color="#34d399" />
            : verifyingState === 'FAILED' ? <ShieldAlert size={14} color="#fff" />
            : verifyingState === 'LOADING' ? <Loader size={14} />
            : <Focus size={14} color={faceDetected ? '#34d399' : '#f87171'} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{statusMessage}</span>
        </div>

        {mode === 'VERIFY' && matchScore !== null && (
          <div style={{
            position: 'absolute', bottom: '12px', right: '12px',
            background: matchScore >= 60 ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
            color: '#fff', padding: '4px 10px', borderRadius: '12px',
            fontSize: '0.72rem', fontWeight: 900, backdropFilter: 'blur(6px)', zIndex: 10
          }}>Match: {matchScore}%</div>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: '360px', marginTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: '6px', fontWeight: 800 }}>
          <span>{mode === 'ENROLL' ? 'Face Alignment' : 'Biometric Match Progress'}</span>
          <span style={{ color: verifyingState === 'FAILED' ? '#ef4444' : '#2563eb' }}>
            {verifyingState === 'FAILED' ? 'ACCESS DENIED' : livenessProgress + '%'}
          </span>
        </div>
        <div style={{ width: '100%', height: '7px', background: 'rgba(15,23,42,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width: livenessProgress + '%', height: '100%',
            background: verifyingState === 'FAILED' ? '#ef4444' : 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
            transition: 'width 0.2s linear',
          }} />
        </div>
      </div>

      {verifyingState === 'FAILED' && (
        <div style={{ marginTop: '14px', textAlign: 'center', width: '100%' }}>
          <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', fontWeight: 800 }}>
            <AlertTriangle size={16} />
            Biometric mismatch: face does not match {targetName}&apos;s enrolled profile.
          </div>
          <button type="button" onClick={handleRetry} className="btn-glow" style={{ padding: '8px 18px', fontSize: '0.82rem' }}>
            <RefreshCw size={14} /> Retry Biometric Verification
          </button>
        </div>
      )}
    </div>
  );
};
