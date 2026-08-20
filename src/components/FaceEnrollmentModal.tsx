import React, { useState, useRef } from 'react';
import { CameraFeed } from './CameraFeed';
import { type Employee, DB } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { X, CheckCircle, UserCheck, Camera, Upload, Edit3, Image as ImageIcon, Save } from 'lucide-react';

interface FaceEnrollmentModalProps {
  employee: Employee;
  onClose: () => void;
  onSuccess: () => void;
}

export const FaceEnrollmentModal: React.FC<FaceEnrollmentModalProps> = ({
  employee,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [activeMode, setActiveMode] = useState<'CAMERA' | 'UPLOAD' | 'MANUAL'>('CAMERA');
  const [enrolled, setEnrolled] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(employee.faceImageUri || null);
  const [manualUri, setManualUri] = useState<string>(employee.faceImageUri || '');
  const [manualDescriptor, setManualDescriptor] = useState<string>(employee.faceProfileData || `descriptor_${employee.employeeId}`);
  const [manualEnabled, setManualEnabled] = useState<boolean>(employee.faceVerificationEnabled ?? true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEnrollSuccess = (descriptor: string, imageUri?: string) => {
    if (currentUser) {
      DB.enrollFace(
        employee.employeeId,
        descriptor,
        currentUser.fullName,
        currentUser.role,
        imageUri || previewUri || '/enrolled_face.jpg'
      );
    }
    setEnrolled(true);
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 1200);
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      DB.updateEmployeeFaceProfile(
        employee.employeeId,
        manualUri,
        manualDescriptor,
        manualEnabled,
        currentUser.fullName,
        currentUser.role
      );
    }
    setPreviewUri(manualUri || '/enrolled_face.jpg');
    setEnrolled(true);
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 1200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      setPreviewUri(dataUri);
      setManualUri(dataUri);

      // Extract face signature vector from uploaded image canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 160, 120);
          const imgData = ctx.getImageData(0, 0, 160, 120);
          let sumR = 0, sumG = 0, sumB = 0;
          for (let i = 0; i < imgData.data.length; i += 4) {
            sumR += imgData.data[i];
            sumG += imgData.data[i + 1];
            sumB += imgData.data[i + 2];
          }
          const descriptor = `descriptor_${Date.now()}_img_${Math.round(sumR/1000)}_${Math.round(sumG/1000)}_${Math.round(sumB/1000)}`;

          if (currentUser) {
            DB.enrollFace(employee.employeeId, descriptor, currentUser.fullName, currentUser.role, dataUri);
          }
          setUploading(false);
          setEnrolled(true);
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1200);
        }
      };
      img.src = dataUri;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '560px', background: '#0d1322', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '12px', color: '#818cf8' }}>
              <UserCheck size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Enroll & Edit Face Profile</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{employee.fullName} ({employee.employeeId})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {enrolled ? (
          <div style={{ textTransform: 'none', textAlign: 'center', padding: '30px 20px' }}>
            <CheckCircle size={56} color="#34d399" style={{ marginBottom: '16px' }} />
            <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Face Profile & Storage Record Saved!
            </h4>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '16px' }}>
              Employee {employee.fullName}'s biometric dataset was updated in the database.
            </p>
            {previewUri && (
              <img
                src={previewUri}
                alt="Enrolled Face"
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #10b981', margin: '0 auto' }}
              />
            )}
          </div>
        ) : (
          <div>
            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '14px' }}>
              <button
                type="button"
                onClick={() => setActiveMode('CAMERA')}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeMode === 'CAMERA' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                  color: activeMode === 'CAMERA' ? '#ffffff' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Camera size={14} /> Webcam Scan
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('UPLOAD')}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeMode === 'UPLOAD' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                  color: activeMode === 'UPLOAD' ? '#ffffff' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Upload size={14} /> Upload Photo
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('MANUAL')}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeMode === 'MANUAL' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                  color: activeMode === 'MANUAL' ? '#ffffff' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Edit3 size={14} /> Edit Storage
              </button>
            </div>

            {activeMode === 'CAMERA' && (
              <CameraFeed
                mode="ENROLL"
                targetName={employee.fullName}
                onSuccess={(descriptor, imageUri) => handleEnrollSuccess(descriptor, imageUri)}
              />
            )}

            {activeMode === 'UPLOAD' && (
              <div style={{ textTransform: 'none', textAlign: 'center', padding: '24px 16px', border: '2px dashed rgba(255, 255, 255, 0.15)', borderRadius: '16px' }}>
                <ImageIcon size={44} color="#818cf8" style={{ marginBottom: '12px' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                  Upload Employee Headshot
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '16px' }}>
                  Select a clear frontal face image (JPG or PNG format)
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-glow"
                  disabled={uploading}
                  style={{ gap: '8px', padding: '10px 20px' }}
                >
                  <Upload size={16} /> {uploading ? 'Processing Image...' : 'Choose Photo File'}
                </button>
              </div>
            )}

            {activeMode === 'MANUAL' && (
              <form onSubmit={handleManualSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                  {manualUri ? (
                    <img
                      src={manualUri}
                      alt="Preview"
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981', margin: '0 auto 8px auto' }}
                    />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto', color: '#94a3b8' }}>
                      No Photo
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Live Storage Image Preview</div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px', display: 'block' }}>
                    Face Image Data URI / URL (Base64 or Path)
                  </label>
                  <textarea
                    rows={3}
                    value={manualUri}
                    onChange={e => {
                      setManualUri(e.target.value);
                      setPreviewUri(e.target.value);
                    }}
                    placeholder="data:image/jpeg;base64,... or /kasindhuja_face.jpg"
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px', display: 'block' }}>
                    Facial Descriptor Signature Vector
                  </label>
                  <input
                    type="text"
                    value={manualDescriptor}
                    onChange={e => setManualDescriptor(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="manualEnabled"
                    checked={manualEnabled}
                    onChange={e => setManualEnabled(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="manualEnabled" style={{ fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', fontWeight: 700 }}>
                    Enable Biometric Verification for Daily Login
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-glow"
                  style={{
                    marginTop: '8px',
                    padding: '10px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    gap: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  }}
                >
                  <Save size={16} /> Save Face & Storage Record
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

