import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import DisclaimerModal from '../components/DisclaimerModal';
import { translations } from '../utils/translations';
import { API_URL } from '../config';

const CATEGORIES = [
  'Gaming',
  'Highlights',
  'Tutorials',
  'Clips',
  'Music',
  'Comedy',
  'Sports',
  'Education',
  'General',
];

function fmtMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function fmtSpeed(bps) {
  return (bps / (1024 * 1024)).toFixed(2) + ' MB/s';
}

function fmtETA(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '\u2014';
  if (seconds < 60) return Math.ceil(seconds) + 's';
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${s}s`;
}

function Upload() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Gaming');
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  // Progress state
  const [isUploading, setIsUploading] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState({ pct: 0, sent: 0, total: 0, speed: 0 });
  const [statusText, setStatusText] = useState('');

  // Drag state
  const [videoDragActive, setVideoDragActive] = useState(false);
  const [thumbDragActive, setThumbDragActive] = useState(false);

  // Disclaimer state
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  const fileInputRef = useRef(null);
  const thumbInputRef = useRef(null);
  const mockTimerRef = useRef(null);
  const xhrRef = useRef(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user'));
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const u = t.upload || {};

  const showToastMsg = useCallback((message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2000);
  }, []);

  // --- Video handling ---
  const handleSetVideo = useCallback((videoFile) => {
    setFile(videoFile);
    setVideoPreview(URL.createObjectURL(videoFile));
    showToastMsg(u.videoSelected || 'Video selected');
  }, [u.videoSelected, showToastMsg]);

  const handleVideoFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSetVideo(e.target.files[0]);
    }
  };

  // Video drag & drop
  const handleVideoDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setVideoDragActive(true);
    } else if (e.type === 'dragleave') {
      setVideoDragActive(false);
    }
  };

  const handleVideoDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      showToastMsg(u.onlyVideo || 'Please drop a video file');
      return;
    }
    handleSetVideo(f);
  };

  // --- Thumbnail handling ---
  const handleSetThumb = useCallback((imgFile) => {
    if (!imgFile.type.startsWith('image/')) {
      showToastMsg(u.onlyImage || 'Please choose an image file (PNG/JPG/WebP)');
      return;
    }
    setThumbnail(imgFile);
    setThumbnailPreview(URL.createObjectURL(imgFile));
    showToastMsg(u.thumbnailSelected || 'Thumbnail selected');
  }, [u.onlyImage, u.thumbnailSelected, showToastMsg]);

  const handleThumbnailChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSetThumb(e.target.files[0]);
    }
  };

  const removeThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview(null);
    showToastMsg(u.thumbnailRemoved || 'Thumbnail removed');
  };

  // Thumb drag & drop
  const handleThumbDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setThumbDragActive(true);
    } else if (e.type === 'dragleave') {
      setThumbDragActive(false);
    }
  };

  const handleThumbDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setThumbDragActive(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      showToastMsg(u.onlyImage || 'Please drop an image file');
      return;
    }
    handleSetThumb(f);
  };

  // --- Mock upload with progress ---
  const mockUpload = useCallback((videoFile) => {
    const total = videoFile.size;
    let sent = 0;
    let lastSent = 0;
    let lastT = performance.now();
    const targetSpeed = (2 + Math.random() * 6) * 1024 * 1024;

    setProgress({ pct: 0, sent: 0, total, speed: 0 });

    mockTimerRef.current = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastT) / 1000;
      lastT = now;

      const speed = targetSpeed * (0.7 + Math.random() * 0.8);
      sent = Math.min(total, sent + speed * dt);

      const dSent = sent - lastSent;
      lastSent = sent;

      const pct = (sent / total) * 100;
      setProgress({ pct, sent, total, speed: dt > 0 ? dSent / dt : 0 });

      if (sent >= total) {
        clearInterval(mockTimerRef.current);
        mockTimerRef.current = null;
        setStatusText(u.processing || 'Processing...');
        setTimeout(() => {
          setStatusText(
            thumbnail
              ? (u.doneVideoThumb || 'Done (video + thumbnail)')
              : (u.doneVideo || 'Done (video)')
          );
          setIsUploading(false);
          showToastMsg(u.uploadComplete || 'Upload complete');
        }, 650);
      }
    }, 120);
  }, [u, thumbnail, showToastMsg]);

  // --- Upload handler ---
  const handleUpload = async () => {
    if (!file) {
      console.warn('[Upload] Intento de subida sin archivo de video.');
      return;
    }

    // 1. Logs de inicio
    console.log(`[Upload] 🚀 Iniciando preparación de subida...`);
    console.log(`[Upload] Video: ${file.name} (${fmtMB(file.size)})`);
    if (thumbnail) {
      console.log(`[Upload] Miniatura: ${thumbnail.name} (${fmtMB(thumbnail.size)})`);
    }

    setShowProgress(true);
    setIsUploading(true);
    setStatusText(u.uploading || 'Uploading...');

    // 2. Validación temprana del Token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('[Upload] ❌ Error: No hay token en localStorage. El usuario no está autenticado.');
      setIsUploading(false);
      setShowProgress(false);
      showToastMsg('No estás autenticado. Por favor, inicia sesión de nuevo.');
      // Opcional: Redirigir al login
      // navigate('/login');
      return;
    }

    // 3. Preparar FormData
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('userId', user ? user.id : 1);
    formData.append('videoFile', file);
    if (thumbnail) {
      formData.append('thumbnail', thumbnail);
    }

    try {
      console.log(`[Upload] 📡 Enviando petición a: ${API_URL}/videos/upload`);
      
      const response = await axios.post(`${API_URL}/videos/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const pct = (progressEvent.loaded / progressEvent.total) * 100;
            setProgress({
              pct,
              sent: progressEvent.loaded,
              total: progressEvent.total,
              speed: progressEvent.rate || 0,
            });
            
            // Log opcional cada 25% para no saturar la consola
            if (pct === 25 || pct === 50 || pct === 75 || pct === 100) {
              console.log(`[Upload] Progreso: ${Math.round(pct)}%`);
            }
          }
        },
      });

      // 4. Éxito
      console.log('[Upload] ✅ Subida completada exitosamente del lado del servidor.');
      console.log('[Upload] Respuesta del servidor:', response.data);

      setProgress((prev) => ({ ...prev, pct: 100, sent: prev.total }));
      setStatusText(
        thumbnail
          ? (u.doneVideoThumb || 'Done (video + thumbnail)')
          : (u.doneVideo || 'Done (video)')
      );
      setIsUploading(false);
      showToastMsg(u.success || 'Video uploaded successfully!');
      setTimeout(() => navigate('/'), 1500);

    } catch (error) {
      // 5. MANEJO DE ERRORES ROBUSTO
      setIsUploading(false);
      setShowProgress(false);

      if (error.response) {
        // El servidor respondió con un código fuera del rango 2xx (400, 401, 500, etc)
        console.error(`[Upload] ❌ Error del servidor (${error.response.status}):`, error.response.data);
        
        if (error.response.status === 401) {
          showToastMsg('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
        } else if (error.response.status === 413) {
          // Captura el error de configuración de Nginx (Payload Too Large)
          showToastMsg('El archivo es demasiado grande. Revisa la configuración de Nginx.');
        } else {
          showToastMsg(error.response.data?.message || error.response.data?.error || 'Error al subir el video.');
        }
      } else if (error.request) {
        // La petición se hizo pero no se recibió respuesta (Servidor apagado, caída de internet)
        console.error('[Upload] ❌ No se recibió respuesta del servidor:', error.request);
        showToastMsg('No se pudo conectar con el servidor. Verificando red...');
        
        // SOLO si el servidor está inaccesible ejecutamos el mock para propósitos de demostración en frontend
        console.log('[Upload] Iniciando simulación (MockUpload) por falta de red...');
        mockUpload(file);
      } else {
        // Algo pasó al configurar la petición en Axios
        console.error('[Upload] ❌ Error al configurar la petición:', error.message);
        showToastMsg('Ocurrió un error inesperado en la aplicación.');
      }
    }
  };

  // --- Cancel handler ---
  const handleCancel = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    if (mockTimerRef.current) {
      clearInterval(mockTimerRef.current);
      mockTimerRef.current = null;
    }
    setStatusText(u.canceled || 'Canceled');
    setIsUploading(false);
    showToastMsg(u.uploadCanceled || 'Upload canceled');
  };

  // --- Save draft ---
  const handleSaveDraft = () => {
    showToastMsg(u.savedDraft || 'Saved draft (mock)');
  };

  // Not logged in state
  if (!user) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Header />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 64px)',
          padding: '20px',
        }}>
          <div className="panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>
              {u.signInRequired || 'Sign in required'}
            </h2>
            <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
              {u.signInToUpload || 'You need to sign in to upload videos.'}
            </p>
            <Link to="/login" className="btn primary">
              {t.login?.signInBtn || 'Sign In'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = Math.max(0, Math.min(100, progress.pct));
  const etaSeconds = progress.speed > 0 ? (progress.total - progress.sent) / progress.speed : Infinity;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />

      <main className="wrap" style={{ maxWidth: '960px', margin: '0 auto', padding: '18px' }}>
        {/* Page header panel */}
        <div className="panel" style={{ padding: '14px' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: '18px', letterSpacing: '-0.2px' }}>
            {u.pageTitle || 'Upload a video'}
          </h1>
          <p style={{ margin: 0, color: 'rgba(234,240,255,0.72)' }}>
            {u.pageSubtitle || 'Includes a progress bar + an option to upload a custom thumbnail (JPG/PNG/WebP).'}
          </p>
        </div>

        {/* Two-column grid */}
        <div className="upload-grid">
          {/* Left: Form */}
          <div className="panel" style={{ padding: '14px' }}>
            {/* Video drop zone */}
            <div
              className={`upload-drop ${videoDragActive ? 'active' : ''}`}
              onDragEnter={handleVideoDrag}
              onDragLeave={handleVideoDrag}
              onDragOver={handleVideoDrag}
              onDrop={handleVideoDrop}
            >
              <strong style={{ fontSize: '13px' }}>{u.videoFile || 'Video file'}</strong>
              <div className="upload-drop-muted">
                {u.dropHere || 'Drag & drop your video here or choose a file.'}
              </div>
              <div className="upload-drop-row">
                <button
                  className="btn"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {u.chooseVideo || 'Choose video'}
                </button>
                <span className="upload-drop-muted">
                  {file ? `${file.name} \u2022 ${fmtMB(file.size)}` : (u.noVideoSelected || 'No video selected')}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Thumbnail drop zone */}
            <div
              className={`upload-drop ${thumbDragActive ? 'active' : ''}`}
              style={{ marginTop: '12px' }}
              onDragEnter={handleThumbDrag}
              onDragLeave={handleThumbDrag}
              onDragOver={handleThumbDrag}
              onDrop={handleThumbDrop}
            >
              <strong style={{ fontSize: '13px' }}>{u.thumbnail || 'Thumbnail (optional)'}</strong>
              <div className="upload-drop-muted">
                {u.thumbnailHint || 'Upload a custom thumbnail. Recommended: 1280x720 (16:9).'}
              </div>
              <div className="upload-drop-row">
                <button
                  className="btn"
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {u.chooseThumbnail || 'Choose thumbnail'}
                </button>
                <span className="upload-drop-muted">
                  {thumbnail ? `${thumbnail.name} \u2022 ${fmtMB(thumbnail.size)}` : (u.noThumbnailSelected || 'No thumbnail selected')}
                </span>
                <button
                  className="btn"
                  type="button"
                  onClick={removeThumbnail}
                  disabled={isUploading || !thumbnail}
                  style={{ opacity: (!thumbnail || isUploading) ? 0.55 : 1 }}
                >
                  {u.remove || 'Remove'}
                </button>
              </div>
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleThumbnailChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Title */}
            <div className="upload-field-group">
              <label className="upload-field-label">{u.titleLabel || 'Title'}</label>
              <input
                className="input"
                placeholder={u.titlePlaceholder || 'e.g., Insane clutch moment'}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {/* Description */}
            <div className="upload-field-group">
              <label className="upload-field-label">{u.descriptionLabel || 'Description'}</label>
              <textarea
                placeholder={u.descriptionPlaceholder || 'Add tags like #gaming #ranked...'}
                maxLength={800}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {/* Category */}
            <div className="upload-field-group">
              <label className="upload-field-label">{u.categoryLabel || 'Category'}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%' }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Disclaimer Agreement */}
            <div className="upload-field-group">
              <div className="upload-disclaimer-row">
                <input
                  type="checkbox"
                  id="disclaimer-checkbox"
                  className="upload-disclaimer-checkbox"
                  checked={disclaimerAccepted}
                  onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                />
                <label htmlFor="disclaimer-checkbox" className="upload-disclaimer-text">
                  {u.disclaimerAgree || 'I agree to the'}{' '}
                  <span
                    className="upload-disclaimer-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDisclaimerModal(true);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowDisclaimerModal(true);
                      }
                    }}
                  >
                    {u.disclaimerClickHere || 'Creator Content Disclaimer (click here to read)'}
                  </span>
                </label>
              </div>
            </div>

            {/* Progress bar */}
            {showProgress && (
              <div className="upload-progress-wrap" aria-label="Upload progress">
                <div
                  className="upload-progress-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPct)}
                >
                  <div
                    className="upload-progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="upload-progress-meta">
                  <div>
                    <span>{Math.round(progressPct)}%</span>
                    {' \u2022 '}
                    <span>{fmtMB(progress.sent)}</span>
                    {' / '}
                    <span>{fmtMB(progress.total)}</span>
                  </div>
                  <div>
                    <span>{fmtSpeed(progress.speed)}</span>
                    {' \u2022 '}
                    <span>{fmtETA(etaSeconds)}</span>
                  </div>
                </div>
                <div className="upload-progress-status">{statusText}</div>
              </div>
            )}

            {/* Actions row */}
            <div className="upload-actions-row">
              <button
                className="btn"
                type="button"
                onClick={handleCancel}
                disabled={!isUploading}
              >
                {u.cancel || 'Cancel'}
              </button>
              <span style={{ flex: 1 }} />
              <button className="btn" type="button" onClick={handleSaveDraft}>
                {u.saveDraft || 'Save draft'}
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !file || !disclaimerAccepted}
              >
                {isUploading ? (u.uploading || 'Uploading...') : (u.publish || 'Upload')}
              </button>
            </div>
          </div>

          {/* Right: Previews */}
          <aside className="panel" style={{ padding: '14px' }}>
            <div className="upload-preview-block">
              <p className="upload-preview-title">{u.preview || 'Preview'}</p>

              {/* Video preview */}
              <div className={`upload-video-box ${videoPreview ? 'has-media' : ''}`}>
                {!videoPreview && (
                  <div className="upload-placeholder">
                    {u.videoPreviewPlaceholder || 'Video preview will appear here'}
                  </div>
                )}
                {videoPreview && (
                  <video
                    src={videoPreview}
                    playsInline
                    muted
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000', display: 'block' }}
                  />
                )}
              </div>

              {/* Thumbnail preview */}
              <div className={`upload-thumb-box ${thumbnailPreview ? 'has-media' : ''}`}>
                {!thumbnailPreview && (
                  <div className="upload-placeholder">
                    {u.thumbPreviewPlaceholder || 'Thumbnail preview will appear here'}
                  </div>
                )}
                {thumbnailPreview && (
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
              </div>

              <div className="upload-drop-muted" style={{ fontSize: '12px', marginTop: '10px' }}>
                {u.thumbAutoHint || 'If no thumbnail is uploaded, your backend can auto-generate one from the video.'}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Toast */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>
        {toast.message}
      </div>

      {/* Disclaimer Modal */}
      <DisclaimerModal
        isOpen={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
        onAccept={() => setDisclaimerAccepted(true)}
        language={lang}
      />
    </div>
  );
}

export default Upload;
