import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ShareModal from '../components/ShareModal';
import { translations } from '../utils/translations';
import { API_URL } from '../config';
import { getVideoUrl, getThumbnailUrl } from '../utils/mediaUtils';

function Favorites() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [shareModal, setShareModal] = useState({ open: false, url: '', title: '' });

  const user = JSON.parse(localStorage.getItem('user'));
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const fv = t.favoritesPage || {};

useEffect(() => {
  if (!user) { setLoading(false); return; }
  const token = localStorage.getItem('token');
  axios.get(`${API_URL}/users/${user.id}/favorites`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => setVideos(res.data))
  .catch(err => console.error(err))
  .finally(() => setLoading(false));
  }, []);

  const handleUnlike = async (videoId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/videos/${videoId}/toggle-like`, { userId: user.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(prev => prev.filter(v => v.id !== videoId));
      showToast(fv.removed || 'Removed from favorites');
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2000);
  };

  const formatCount = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n;
  };

  const getThumb = (video) => {
    return getThumbnailUrl(video?.thumbnailUrl);
  };

  const getCreatorName = (video) => video.User?.email?.split('@')[0] || 'creator';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onSearch={() => {}} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>
          {/* Page header */}
          <section className="home-hero" style={{ marginBottom: '18px' }}>
            <h1 className="home-hero-title">{fv.title || 'Favorites'}</h1>
            <p className="home-hero-subtitle">{fv.subtitle || 'Videos you have liked.'}</p>
            {videos.length > 0 && (
              <span className="home-card-badge" style={{ marginTop: '8px', display: 'inline-block' }}>
                {videos.length} {fv.videosCount || 'videos'}
              </span>
            )}
          </section>

          {!user ? (
            <div className="home-empty">
              <p>{fv.signInRequired || 'Sign in to see your favorites.'}</p>
              <Link to="/login" className="btn primary">{t.header?.login || 'Login'}</Link>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              {t.common?.loading || 'Loading...'}
            </div>
          ) : videos.length === 0 ? (
            <div className="home-empty">
              <p>{fv.noFavorites || 'You haven\'t liked any videos yet.'}</p>
              <Link to="/" className="btn primary">{fv.browseBtn || 'Browse videos'}</Link>
            </div>
          ) : (
            <div className="home-grid">
              {videos.map(video => (
                <div key={video.id} className="home-card" style={{ cursor: 'default' }}>
                  {/* Thumbnail */}
                  <Link to={`/watch/${video.id}`} className="home-card-thumb" style={{ textDecoration: 'none' }}>
                    {getThumb(video) ? (
                      <img src={getThumb(video)} alt={video.title || ''} loading="lazy" />
                    ) : (
                      <video
                        src={getVideoUrl(video.videoUrl)}
                        preload="metadata"
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    <div className="home-card-play">
                      <div style={{
                        width: 0, height: 0,
                        borderLeft: '12px solid var(--text)',
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        marginLeft: '2px',
                      }} />
                    </div>
                    <div className="home-card-duration">
                      {formatCount(video.views || 0)} {fv.viewsLabel || 'views'}
                    </div>
                  </Link>

                  {/* Body */}
                  <div className="home-card-body">
                    <Link to={`/watch/${video.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <p className="home-card-title">{video.title || 'Untitled'}</p>
                    </Link>
                    <div className="home-card-meta">
                      <span className="home-card-badge">@{getCreatorName(video)}</span>
                      {video.category && <span className="home-card-badge">{video.category}</span>}

                      <div className="home-card-actions">
                        {/* Unlike / remove */}
                        <button
                          className="home-card-action-btn liked"
                          onClick={() => handleUnlike(video.id)}
                          title={fv.removeFav || 'Remove from favorites'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF4D6D" stroke="#FF4D6D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                          </svg>
                          <span>{formatCount(video.Likes?.length || 0)}</span>
                        </button>

                        {/* Share */}
                        <button
                          className="home-card-action-btn"
                          onClick={() => {
                            const url = `${window.location.origin}/watch/${video.id}`;
                            setShareModal({ open: true, url, title: video.title || '' });
                          }}
                          title={t.home?.share || 'Share'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <ShareModal
        isOpen={shareModal.open}
        onClose={() => setShareModal({ open: false, url: '', title: '' })}
        url={shareModal.url}
        title={shareModal.title}
      />

      <div className={`toast ${toast.show ? 'show' : ''}`}>{toast.message}</div>
    </div>
  );
}

export default Favorites;
