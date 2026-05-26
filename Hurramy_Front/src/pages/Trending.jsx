import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import RightPanel from '../components/RightPanel';
import Header from '../components/Header';
import ShareModal from '../components/ShareModal';
import { translations } from '../utils/translations';
import { API_URL } from '../config';
import { getVideoUrl, getThumbnailUrl } from '../utils/mediaUtils';

function Trending() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [likedVideos, setLikedVideos] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shareModal, setShareModal] = useState({ open: false, url: '', title: '' });
  const user = JSON.parse(localStorage.getItem('user'));
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const tp = t.trendingPage || {};

  useEffect(() => { loadTrending(); }, []);

  const loadTrending = () => {
    setLoading(true);
    // CORRECCIÓN: Uso de API_URL dinámica
    axios.get(`${API_URL}/videos/trending`)
      .then(res => {
        setVideos(res.data);
        if (user) {
          const liked = {};
          res.data.forEach(v => {
            if (v.Likes && v.Likes.some(l => l.userId === user.id)) liked[v.id] = true;
          });
          setLikedVideos(liked);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 2400);
  };

  const handleLike = async (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { showToast(t.home?.loginToLike || 'Login to like'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/videos/${video.id}/toggle-like`, { userId: user.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const nowLiked = res.data?.liked ?? !likedVideos[video.id];
      setLikedVideos(prev => ({ ...prev, [video.id]: nowLiked }));
      setVideos(prev => prev.map(v => {
        if (v.id === video.id) {
          const cur = v.Likes?.length || v.likeCount || 0;
          return { ...v, likeCount: nowLiked ? cur + 1 : Math.max(0, cur - 1), Likes: Array(nowLiked ? cur + 1 : Math.max(0, cur - 1)).fill({}) };
        }
        return v;
      }));
      showToast(nowLiked ? (t.home?.liked || 'Liked') : (t.home?.likeRemoved || 'Like removed'));
    } catch (err) {
      showToast('Error');
    }
  };

  const handleShare = (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    setShareModal({ open: true, url: `${window.location.origin}/watch/${video.id}`, title: video.title || '' });
  };

  const formatCount = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n;
  };

  const getFlowerCount = (video) => video?.flowers ?? video?.flowerCount ?? video?.Flowers?.length ?? 0;

  const getVideoThumbnail = (video) => {
    return getThumbnailUrl(video.thumbnailUrl);
  };

  const getCreatorName = (video) => {
    if (video.User?.email) return video.User.email.split('@')[0];
    return 'creator';
  };

  const getRankBadge = (index) => {
    if (index === 0) return { label: '#1', bg: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' };
    if (index === 1) return { label: '#2', bg: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)', color: '#000' };
    if (index === 2) return { label: '#3', bg: 'linear-gradient(135deg, #CD7F32, #A0522D)', color: '#fff' };
    return { label: `#${index + 1}`, bg: 'rgba(234,240,255,0.10)', color: 'var(--muted)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main style={{ padding: '18px', overflowY: 'auto' }}>
          {/* Hero */}
          <section className="home-hero" style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <h1 className="home-hero-title" style={{ margin: 0 }}>{tp.title || 'Trending'}</h1>
            </div>
            <p className="home-hero-subtitle">{tp.subtitle || 'Videos with the most engagement in the least time.'}</p>
          </section>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div className="spinner" />
            </div>
          ) : videos.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              background: 'var(--panel)', border: '1px solid var(--line)',
              borderRadius: 'var(--r22)', color: 'var(--muted)',
            }}>
              <p style={{ fontSize: '15px', fontWeight: 600 }}>{tp.noVideos || 'No trending videos yet.'}</p>
            </div>
          ) : (
            <div className="home-grid">
              {videos.map((video, index) => {
                const rank = getRankBadge(index);
                return (
                  <Link key={video.id} to={`/watch/${video.id}`} className="home-card" style={{ position: 'relative' }}>
                    {/* Rank badge */}
                    <div style={{
                      position: 'absolute', top: '10px', left: '10px', zIndex: 3,
                      background: rank.bg, color: rank.color,
                      padding: '3px 9px', borderRadius: '8px',
                      fontSize: '11px', fontWeight: 800, letterSpacing: '-0.3px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                    }}>
                      {rank.label}
                    </div>

                    {/* Thumbnail */}
                    <div className="home-card-thumb">
                      {getVideoThumbnail(video) ? (
                        <img src={getVideoThumbnail(video)} alt={video.title || 'Video'} loading="lazy" />
                      ) : (
                        <video
                          src={getVideoUrl(video.videoUrl)}
                          preload="metadata" muted
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
                        {formatCount(video.views || 0)} {t.home?.views || 'views'}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="home-card-body">
                      <p className="home-card-title">{video.title || 'Untitled'}</p>
                      <div className="home-card-meta">
                        <span className="home-card-badge">@{getCreatorName(video)}</span>
                        {video.category && <span className="home-card-badge">{video.category}</span>}
                        <div className="home-card-actions">
                          <button
                            className={`home-card-action-btn ${likedVideos[video.id] ? 'liked' : ''}`}
                            onClick={(e) => handleLike(e, video)}
                            title={t.home?.like || 'Like'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24"
                              fill={likedVideos[video.id] ? '#FF4D6D' : 'none'}
                              stroke={likedVideos[video.id] ? '#FF4D6D' : 'currentColor'}
                              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            <span>{formatCount(video.Likes?.length || video.likeCount || 0)}</span>
                          </button>
                          <span
                            className="home-card-action-btn"
                            title={t.campaignDetail?.flowers || 'flowers'}
                            style={{ cursor: 'default' }}
                          >
                            <span aria-hidden="true">🌸</span>
                            <span>{formatCount(getFlowerCount(video))}</span>
                          </span>
                          <button
                            className="home-card-action-btn"
                            onClick={(e) => handleShare(e, video)}
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
                  </Link>
                );
              })}
            </div>
          )}
        </main>

        <RightPanel
          videos={videos}
          onPlayVideo={(index) => {
            const video = videos[index];
            if (video) window.location.href = `/watch/${video.id}`;
          }}
        />
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

export default Trending;
