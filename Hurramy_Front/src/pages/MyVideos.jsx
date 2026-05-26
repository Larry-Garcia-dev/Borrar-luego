import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { translations } from '../utils/translations';
import { API_URL } from '../config';
import { getVideoUrl, getThumbnailUrl } from '../utils/mediaUtils';

const API = API_URL;

function MyVideos() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const mv = t.myVideos || {};

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editThumbFile, setEditThumbFile] = useState(null);
  const [editThumbPreview, setEditThumbPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [toast, setToast] = useState('');
  const thumbInputRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const thumbUrl = (video) => {
    return getThumbnailUrl(video.thumbnailUrl);
  };

  useEffect(() => {
    if (!user) return;
    
    // Cargar todos los videos del usuario con paginacion
    const fetchAllUserVideos = async () => {
      try {
        let allVideos = [];
        let page = 1;
        let hasMore = true;
        
        // Obtener todos los videos paginados
        while (hasMore) {
          const res = await axios.get(`${API}/videos?page=${page}&limit=50`);
          console.log('[v0] API Response page', page, ':', res.data);
          
          // El API devuelve { videos: [...], currentPage, totalPages, hasMore }
          const videosArray = res.data.videos || res.data;
          
          if (Array.isArray(videosArray)) {
            allVideos = [...allVideos, ...videosArray];
          }
          
          hasMore = res.data.hasMore || false;
          page++;
          
          // Seguridad: maximo 10 paginas
          if (page > 10) break;
        }
        
        console.log('[v0] All videos fetched:', allVideos.length);
        console.log('[v0] Current user ID:', user.id, 'Type:', typeof user.id);
        
        // Filtrar solo los videos del usuario actual
        const mine = allVideos.filter(v => {
          const match = String(v.userId) === String(user.id);
          if (match) {
            console.log('[v0] Found user video:', v.id, v.title);
          }
          return match;
        });
        
        console.log('[v0] User videos found:', mine.length);
        setVideos(mine);
      } catch (err) {
        console.log('[v0] Error fetching videos:', err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllUserVideos();
  }, []);

  /* ── Sign-in wall ── */
  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>{mv.signInRequired || 'Sign in required'}</h2>
          <button className="btn primary" onClick={() => navigate('/login')} style={{ marginTop: '12px' }}>
            {t.header?.login || 'Login'}
          </button>
        </div>
      </div>
    );
  }

  /* ── Edit helpers ── */
  const startEdit = (video) => {
    setEditingId(video.id);
    setEditTitle(video.title);
    setEditDesc(video.description || '');
    setEditThumbFile(null);
    setEditThumbPreview(thumbUrl(video));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDesc('');
    setEditThumbFile(null);
    setEditThumbPreview(null);
  };

  const handleThumbPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast(mv.onlyImage || 'Only image files'); return; }
    setEditThumbFile(file);
    setEditThumbPreview(URL.createObjectURL(file));
  };

  const handleSave = async (videoId) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', editTitle);
      fd.append('description', editDesc);
      if (editThumbFile) fd.append('thumbnail', editThumbFile);

      const token = localStorage.getItem('token');
      const res = await axios.put(`${API}/videos/${videoId}`, fd, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      const updated = res.data.video || res.data;
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, ...updated } : v));
      cancelEdit();
      showToast(mv.saved || 'Video saved');
    } catch (err) {
      showToast(err.response?.data?.message || mv.errorSaving || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete helpers ── */
  const handleDelete = async (videoId) => {
    setDeletingId(videoId);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/videos/${videoId}`, {
        data: { userId: user.id },
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(prev => prev.filter(v => v.id !== videoId));
      setDeleteConfirmId(null);
      showToast(mv.deleted || 'Video deleted');
    } catch (err) {
      showToast(err.response?.data?.message || mv.errorDeleting || 'Error deleting');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (sec) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  /* ── Render ── */
  return (
    <>
      <Header onToggleSidebar={() => setSidebarOpen(p => !p)} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main style={{ padding: '18px', overflowY: 'auto', maxWidth: '860px', margin: '0 auto', width: '100%' }}>
          <h1 style={{ fontWeight: 850, fontSize: '22px', marginBottom: '4px' }}>{mv.title || 'My Videos'}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
            {mv.subtitle || 'Manage your uploaded videos.'}
          </p>

          {loading ? (
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>Loading...</p>
          ) : videos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: 'var(--muted)', marginBottom: '12px' }}>{mv.noVideos || 'You have no videos yet.'}</p>
              <Link to="/upload" className="btn primary" style={{ padding: '10px 20px', textDecoration: 'none' }}>
                {t.header?.upload || 'Upload'}
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {videos.map(video => {
                const isEditing = editingId === video.id;
                const tUrl = thumbUrl(video);
                const isConfirmingDelete = deleteConfirmId === video.id;
                const isDeleting = deletingId === video.id;

                return (
                  <div key={video.id} style={{
                    border: '1px solid var(--line)',
                    borderRadius: '18px',
                    background: 'var(--panel)',
                    overflow: 'hidden',
                  }}>
                    {/* Top row: thumbnail + info */}
                    <div style={{ display: 'flex', gap: '14px', padding: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                      {/* ── Thumbnail ── */}
                      <div style={{
                        width: '180px', minWidth: '140px', aspectRatio: '16/9', borderRadius: '12px',
                        background: 'rgba(0,0,0,0.30)', overflow: 'hidden',
                        flexShrink: 0, position: 'relative',
                      }}>
                        {isEditing ? (
                          /* Editable thumbnail: clickable overlay */
                          <div
                            onClick={() => thumbInputRef.current?.click()}
                            style={{
                              width: '100%', height: '100%', cursor: 'pointer',
                              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {editThumbPreview ? (
                              <img src={editThumbPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                                </svg>
                                <span style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center' }}>
                                  {mv.clickToChangeThumbnail || 'Click to change'}
                                </span>
                              </div>
                            )}
                            {/* Always-visible overlay on edit mode */}
                            <div style={{
                              position: 'absolute', inset: 0,
                              background: 'rgba(0,0,0,0.45)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              opacity: editThumbPreview ? 0 : 1,
                              transition: 'opacity 0.15s ease',
                            }}
                              onMouseEnter={e => { if (editThumbPreview) e.currentTarget.style.opacity = 1; }}
                              onMouseLeave={e => { if (editThumbPreview) e.currentTarget.style.opacity = 0; }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                <span style={{ fontSize: '10px', color: 'white', fontWeight: 600 }}>
                                  {mv.changeThumbnail || 'Change thumbnail'}
                                </span>
                              </div>
                            </div>
                            <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleThumbPick} style={{ display: 'none' }} />
                          </div>
                        ) : (
                          /* Read-only thumbnail */
                          <Link to={`/watch/${video.id}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                            {tUrl ? (
                              <img src={tUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              </div>
                            )}
                          </Link>
                        )}
                        {/* Duration badge (view mode only) */}
                        {!isEditing && (
                          <span style={{
                            position: 'absolute', bottom: '6px', right: '6px',
                            background: 'rgba(0,0,0,0.75)', borderRadius: '6px',
                            padding: '2px 6px', fontSize: '10px', fontWeight: 700,
                            color: 'white', fontVariantNumeric: 'tabular-nums',
                          }}>
                            {formatDuration(video.duration)}
                          </span>
                        )}
                      </div>

                      {/* ── Info column ── */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {isEditing ? (
                          <>
                            <input
                              className="input"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              placeholder={mv.titlePlaceholder || 'Title'}
                              style={{ fontSize: '14px', fontWeight: 700 }}
                            />
                            <textarea
                              className="input"
                              value={editDesc}
                              onChange={e => setEditDesc(e.target.value)}
                              placeholder={mv.descPlaceholder || 'Description'}
                              rows={3}
                              style={{ fontSize: '12px', resize: 'vertical' }}
                            />
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {video.title}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {video.description || (mv.noDescription || 'No description')}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--muted)', marginTop: 'auto', paddingTop: '4px' }}>
                              <span>{video.views || 0} {t.home?.views || 'views'}</span>
                              <span>{video.Likes?.length || 0} {t.rightPanel?.likesLabel || 'likes'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* ── Action buttons row ── */}
                    <div style={{
                      display: 'flex', gap: '8px', padding: '0 14px 14px', flexWrap: 'wrap', alignItems: 'center',
                    }}>
                      {isEditing ? (
                        <>
                          <button className="btn primary" onClick={() => handleSave(video.id)} disabled={saving} style={{ fontSize: '12px', padding: '7px 16px' }}>
                            {saving ? (mv.saving || 'Saving...') : (mv.saveBtn || 'Save')}
                          </button>
                          <button className="btn ghost" onClick={cancelEdit} style={{ fontSize: '12px', padding: '7px 14px' }}>
                            {t.upload?.cancel || 'Cancel'}
                          </button>
                        </>
                      ) : isConfirmingDelete ? (
                        /* Delete confirmation */
                        <>
                          <span style={{ fontSize: '12px', color: 'var(--bad)', fontWeight: 600 }}>
                            {mv.deleteConfirm || 'Delete this video?'}
                          </span>
                          <button
                            className="btn"
                            onClick={() => handleDelete(video.id)}
                            disabled={isDeleting}
                            style={{
                              fontSize: '12px', padding: '7px 14px',
                              background: 'rgba(255,77,109,0.14)', border: '1px solid rgba(255,77,109,0.30)',
                              color: 'var(--bad)', borderRadius: '12px',
                            }}
                          >
                            {isDeleting ? '...' : (mv.confirmYes || 'Yes, delete')}
                          </button>
                          <button className="btn ghost" onClick={() => setDeleteConfirmId(null)} style={{ fontSize: '12px', padding: '7px 14px' }}>
                            {mv.confirmNo || 'No, keep'}
                          </button>
                        </>
                      ) : (
                        /* Normal actions */
                        <>
                          <button className="btn ghost" onClick={() => startEdit(video)} style={{ fontSize: '12px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            {mv.editBtn || 'Edit'}
                          </button>
                          <Link to={`/watch/${video.id}`} className="btn ghost" style={{ fontSize: '12px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                            {mv.watchBtn || 'Watch'}
                          </Link>
                          <button
                            className="btn ghost"
                            onClick={() => setDeleteConfirmId(video.id)}
                            style={{ fontSize: '12px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--bad)', marginLeft: 'auto' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"/>
                              <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                            {mv.deleteBtn || 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

export default MyVideos;
