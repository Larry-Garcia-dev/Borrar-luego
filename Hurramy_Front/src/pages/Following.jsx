import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { translations } from '../utils/translations';
import { API_URL } from '../config';
import { getThumbnailUrl, getAvatarUrl } from '../utils/mediaUtils';

function Following() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  const user = JSON.parse(localStorage.getItem('user'));
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const ft = t.followingPage || {};

useEffect(() => {
  if (!user) { setLoading(false); return; }
  const token = localStorage.getItem('token');
  axios.get(`${API_URL}/users/${user.id}/following-feed`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => setFeed(res.data))
  .catch(err => console.error(err))
  .finally(() => setLoading(false));
  }, []);

  const handleUnfollow = async (creatorId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/users/toggle-follow`, {
        followerId: user.id,
        followingId: creatorId,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setFeed(prev => prev.filter(f => f.id !== creatorId));
      showToast(ft.unfollowed || 'Unfollowed');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onSearch={() => {}} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>
          {/* Page header */}
          <section className="home-hero" style={{ marginBottom: '18px' }}>
            <h1 className="home-hero-title">{ft.title || 'Following'}</h1>
            <p className="home-hero-subtitle">{ft.subtitle || 'People you follow and their top video.'}</p>
          </section>

          {!user ? (
            <div className="home-empty">
              <p>{ft.signInRequired || 'Sign in to see who you follow.'}</p>
              <Link to="/login" className="btn primary">{t.header?.login || 'Login'}</Link>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              {t.common?.loading || 'Loading...'}
            </div>
          ) : feed.length === 0 ? (
            <div className="home-empty">
              <p>{ft.noFollowing || 'You are not following anyone yet.'}</p>
              <Link to="/" className="btn primary">{ft.discoverBtn || 'Discover creators'}</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {feed.map(creator => (
                <div key={creator.id} className="home-card" style={{ flexDirection: 'row', flexWrap: 'wrap', cursor: 'default' }}>
                  {/* Creator info left */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', flex: '1 1 280px', minWidth: 0 }}>
                    {/* Avatar */}
                    <div style={{
                      width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                      background: 'linear-gradient(135deg, var(--brand), var(--brand2))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--line)',
                    }}>
                      {creator.avatar ? (
                        <img src={getAvatarUrl(creator.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: '18px' }}>
                          {creator.email?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name & stats */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {creator.username}
                      </p>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '12px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                        <span>{formatCount(creator.followers)} {ft.followers || 'followers'}</span>
                        <span>{creator.videoCount} {ft.videos || 'videos'}</span>
                      </div>
                    </div>

                    {/* Unfollow button */}
                    <button
                      className="btn"
                      style={{ padding: '6px 14px', fontSize: '12px', flexShrink: 0 }}
                      onClick={() => handleUnfollow(creator.id)}
                    >
                      {ft.unfollowBtn || 'Unfollow'}
                    </button>
                  </div>

                  {/* Top video right */}
                  {creator.topVideo ? (
                    <Link
                      to={`/watch/${creator.topVideo.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                        borderTop: '1px solid var(--line)', flex: '1 1 320px',
                        textDecoration: 'none', color: 'inherit',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Thumb */}
                      <div style={{
                        width: '110px', height: '68px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
                        background: 'radial-gradient(circle, rgba(25,211,255,0.12), rgba(124,92,255,0.12))',
                      }}>
                        {getThumb(creator.topVideo) ? (
                          <img src={getThumb(creator.topVideo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Video info */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {creator.topVideo.title || 'Untitled'}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', color: 'var(--muted)' }}>
                          <span>{formatCount(creator.topVideo.views)} {ft.viewsLabel || 'views'}</span>
                          <span>{formatCount(creator.topVideo.likes)} {ft.likesLabel || 'likes'}</span>
                        </div>
                        <span className="home-card-badge" style={{ marginTop: '4px', display: 'inline-block', fontSize: '10px', padding: '2px 8px' }}>
                          {ft.topVideoLabel || 'Top video'}
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <div style={{ padding: '16px', fontSize: '12px', color: 'var(--muted)', borderTop: '1px solid var(--line)', flex: '1 1 320px' }}>
                      {ft.noVideosYet || 'No videos yet'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <div className={`toast ${toast.show ? 'show' : ''}`}>{toast.message}</div>
    </div>
  );
}

export default Following;
