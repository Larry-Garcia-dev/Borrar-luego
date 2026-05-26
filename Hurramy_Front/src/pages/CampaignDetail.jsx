import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import { translations } from '../utils/translations';
import { API_URL } from '../config';
import { getVideoUrl, getThumbnailUrl, getMediaUrl } from '../utils/mediaUtils';
import JoinVideoSidebar from '../components/JoinVideoSidebar';

function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [myVideos, setMyVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('likes_desc');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [previewVideo, setPreviewVideo] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [previewComments, setPreviewComments] = useState([]);
  const [showFlowerModal, setShowFlowerModal] = useState(false);
  const [flowersToGive, setFlowersToGive] = useState(1);
  const [loading, setLoading] = useState(true);
  const [globalMuted, setGlobalMuted] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const shouldAutoplayPreview = useRef(false);
  const previewVideoRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const cd = t.campaignDetail || {};
  const vp = t.videoPlayer || {};

  useEffect(() => {
    loadCampaignData();
    if (user) loadMyVideos();
    updateTimestamp();
  }, [id]);

  useEffect(() => {
    if (!shouldAutoplayPreview.current || !previewVideoRef.current) return;
    shouldAutoplayPreview.current = false;
    previewVideoRef.current.play().catch(() => {});
  }, [previewVideo?.id]);

  useEffect(() => {
    setPreviewComments(previewVideo?.Comments || []);
    setCommentText('');
  }, [previewVideo?.id]);

  const updateTimestamp = () => {
    const locale = lang === 'es' ? 'es-ES' : lang === 'zh' ? 'zh-CN' : 'en-US';
    setLastUpdated(new Date().toLocaleString(locale));
  };

  const loadCampaignData = () => {
    setLoading(true);
    // CORRECCIÓN: Uso de API_URL dinámica
    axios.get(`${API_URL}/campaigns/${id}`)
      .then(res => {
        setCampaign(res.data);
        if (res.data.Videos?.length > 0) {
          shouldAutoplayPreview.current = true;
          setPreviewVideo(res.data.Videos[0]);
        }
        updateTimestamp();
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const loadMyVideos = () => {
    // Use protected endpoint to fetch only user's videos
    const token = localStorage.getItem('token');
    axios.get(`${API_URL}/videos/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setMyVideos(res.data);
      })
      .catch(err => console.error('Error loading my videos:', err));
  };

  const handleJoin = async () => {
    if (!selectedVideoId) {
      showToast(cd.selectToJoin || 'Select a video to join');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/campaigns/${id}/join`, {
        videoId: selectedVideoId
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast(cd.joinedSuccess || 'Successfully joined the campaign!');
      loadCampaignData();
      setSelectedVideoId('');
    } catch (error) {
      showToast(error.response?.data?.message || (cd.errorJoining || 'Error joining campaign'));
    }
  };

  const handleLike = async (videoId, e) => {
    if (e) e.stopPropagation();
    if (!user) {
      showToast(cd.signInToLike || 'Sign in to like videos');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/videos/${videoId}/like`, { userId: user.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadCampaignData();
      showToast('Liked!');
    } catch {
      showToast('Already liked');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast(cd.campaignLinkCopied || 'Campaign link copied!');
  };

  const handleCopyVideoLink = () => {
    if (previewVideo) {
      navigator.clipboard.writeText(`${window.location.origin}/watch/${previewVideo.id}`);
      showToast(cd.videoLinkCopied || 'Video link copied!');
    }
  };

  const openFlowerModal = () => {
    if (!user) {
      showToast(vp.signInToGiveFlowers || 'Sign in to give flowers');
      return;
    }
    setFlowersToGive(1);
    setShowFlowerModal(true);
  };

  const handleGiveFlowersSubmit = async () => {
    if (!user || !previewVideo) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/videos/${previewVideo.id}/flowers`, {
        userId: user.id,
        flowersCount: flowersToGive
      }, { headers: { Authorization: `Bearer ${token}` } });

      const nextFlowerTotal = res.data.videoFlowersTotal ?? (getFlowerCount(previewVideo) + flowersToGive);
      const updatedUser = { ...user, waiCoins: res.data.remainingCoins };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setPreviewVideo(video => video ? { ...video, flowers: nextFlowerTotal } : video);
      setCampaign(current => current ? {
        ...current,
        Videos: current.Videos?.map(video =>
          video.id === previewVideo.id ? { ...video, flowers: nextFlowerTotal } : video
        )
      } : current);
      setShowFlowerModal(false);
      showToast(vp.flowersGiven || 'Flowers given successfully!');
    } catch (error) {
      showToast(error.response?.data?.message || vp.errorGivingFlowers || 'Error giving flowers');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!previewVideo) return;
    if (!user) {
      showToast(vp.signInToComment || 'Sign in to comment');
      return;
    }
    if (!commentText.trim()) {
      showToast(vp.writeComment || 'Write a comment first');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/videos/${previewVideo.id}/comment`, {
        userId: user.id,
        text: commentText
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPreviewComments([res.data, ...previewComments]);
      setCommentText('');
      showToast(vp.commentPosted || 'Comment posted');
    } catch (error) {
      console.error(error);
      showToast(vp.errorComment || 'Error posting comment');
    }
  };

  const handleReset = () => {
    loadCampaignData();
    showToast(cd.dataRefreshed || 'Data refreshed');
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 1200);
  };

  const handlePreviewSelect = (video) => {
    shouldAutoplayPreview.current = true;
    setPreviewVideo(video);
  };

  const formatNumber = (n) => {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const locale = lang === 'es' ? 'es-ES' : lang === 'zh' ? 'zh-CN' : 'en-US';
    return new Date(dateValue).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDeadlineInfo = (dateValue) => {
    if (!dateValue) return { value: '--', unit: '', date: '' };
    const endDate = new Date(dateValue);
    const diffMs = endDate.getTime() - Date.now();
    const absMs = Math.max(diffMs, 0);
    const days = Math.ceil(absMs / (1000 * 60 * 60 * 24));
    const hours = Math.ceil(absMs / (1000 * 60 * 60));

    if (diffMs <= 0) {
      return {
        value: '0',
        unit: lang === 'zh' ? '天' : lang === 'es' ? 'dias' : 'days',
        date: formatDate(dateValue),
        ended: true,
      };
    }

    if (days <= 1) {
      return {
        value: String(hours),
        unit: lang === 'zh' ? '小时' : lang === 'es' ? 'horas' : 'hours',
        date: formatDate(dateValue),
      };
    }

    return {
      value: String(days),
      unit: lang === 'zh' ? '天' : lang === 'es' ? 'dias' : 'days',
      date: formatDate(dateValue),
    };
  };

  const getRankBadge = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getFilteredVideos = () => {
    if (!campaign?.Videos) return [];
    
    let videos = [...campaign.Videos];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      videos = videos.filter(v =>
        v.title?.toLowerCase().includes(q) ||
        v.User?.email?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'likes_desc':
        videos.sort((a, b) => (b.Likes?.length || 0) - (a.Likes?.length || 0));
        break;
      case 'likes_asc':
        videos.sort((a, b) => (a.Likes?.length || 0) - (b.Likes?.length || 0));
        break;
      case 'title_asc':
        videos.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'creator_asc':
        videos.sort((a, b) => (a.User?.email || '').localeCompare(b.User?.email || ''));
        break;
      default:
        break;
    }

    return videos;
  };

  const totalLikes = campaign?.Videos?.reduce((sum, v) => sum + (v.Likes?.length || 0), 0) || 0;
  const filteredVideos = getFilteredVideos();
  const deadline = getDeadlineInfo(campaign?.endDate);
  const isCampaignActive = (campaign?.status ? campaign.status === 'Active' : true) && !deadline.ended;
  const getLikeCount = (video) => video?.likeCount ?? video?.Likes?.length ?? 0;
  const getFlowerCount = (video) => video?.flowers ?? video?.flowerCount ?? video?.Flowers?.length ?? 0;
  const getPointCount = (video) => (getFlowerCount(video) * 100) + getLikeCount(video);
  const previewActionButtonStyle = {
    minHeight: '40px',
    padding: '8px 12px',
    lineHeight: 1,
  };
  const getVideoThumbnail = (video) => getThumbnailUrl(video?.thumbnailUrl);
  const getVideoSrc = (video) => getVideoUrl(video?.videoUrl);
  const renderVideoThumb = (video, style = {}) => {
    const thumbnail = getVideoThumbnail(video);
    const baseStyle = { width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style };

    return thumbnail ? (
      <img src={thumbnail} alt={video?.title || 'Video'} loading="lazy" style={baseStyle} />
    ) : (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
        <video
          src={`${getVideoSrc(video)}#t=1`}
          preload="metadata"
          muted
          playsInline
          crossOrigin="anonymous"
          style={baseStyle}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--muted)" stroke="none">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      </div>
    );
  };

  const renderPreviewPlayer = () => (
    previewVideo ? (
      <>
        <div className="player" style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid var(--line)',
          background: 'rgba(0,0,0,0.35)',
          boxShadow: '0 26px 90px rgba(0,0,0,0.35)',
          aspectRatio: '16/9',
        }}>
          <video
            ref={previewVideoRef}
            playsInline
            controls
            autoPlay
            preload="metadata"
            muted={globalMuted}
            src={getVideoSrc(previewVideo)}
            style={{ width: '100%', height: '100%', display: 'block', background: '#000' }}
          />
        </div>
        <div className="pMeta" style={{ padding: '12px 2px 16px', borderBottom: '1px solid var(--line)', marginBottom: '12px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>{previewVideo.title}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {cd.by || 'By'} <b>@{previewVideo.User?.email?.split('@')[0] || 'Creator'}</b> • {previewVideo.views || 0} {cd.views || 'views'}
          </p>
          <div className="pActions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '10px 0 0' }}>
            <button onClick={() => handleLike(previewVideo.id)} className="btn primary" style={previewActionButtonStyle}>❤️ {cd.likeBtn || 'Like'}</button>
            <button type="button" onClick={openFlowerModal} className="btn" style={previewActionButtonStyle}>🌸 Flower {formatNumber(getFlowerCount(previewVideo))}</button>
            <button onClick={handleCopyVideoLink} className="btn" style={previewActionButtonStyle}>📋 {cd.copyVideoLink || 'Copy video link'}</button>
            <Link to={`/watch/${previewVideo.id}`} className="btn" style={previewActionButtonStyle}>▶️ {cd.watchFull || 'Watch full'}</Link>
          </div>
          <div className="muted" style={{ fontSize: '12px', marginTop: '10px' }}>
            {formatNumber(previewVideo.Likes?.length || 0)} {cd.likes || 'likes'} • {previewVideo.description || (cd.noDescriptionPreview || 'No description')}
          </div>
        </div>
        <div className="card" style={{
          border: '1px solid var(--line)',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '18px',
          padding: '12px',
          marginBottom: '12px',
        }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '14px' }}>{vp.leaveComment || 'Leave a comment'}</h3>

          {user ? (
            <form onSubmit={handleComment}>
              <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', color: 'rgba(234,240,255,0.72)' }}>{vp.yourName || 'Your name'}</label>
                <input
                  className="input"
                  value={user.email}
                  disabled
                  maxLength={40}
                  style={{
                    border: '1px solid var(--line)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)',
                    borderRadius: '14px',
                    padding: '10px 12px',
                    opacity: 0.7,
                  }}
                />
              </div>

              <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', color: 'rgba(234,240,255,0.72)' }}>{vp.comment || 'Comment'}</label>
                <textarea
                  id="campaignCommentInput"
                  className="input"
                  placeholder={vp.writeSomething || 'Write something...'}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={600}
                  style={{
                    border: '1px solid var(--line)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)',
                    borderRadius: '14px',
                    padding: '10px 12px',
                    minHeight: '96px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="submit" className="btn primary">{vp.post || 'Post'}</button>
                <button type="button" className="btn" onClick={() => setCommentText('')}>{vp.clear || 'Clear'}</button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p className="muted" style={{ marginBottom: '12px' }}>{vp.signInToLeaveComment || 'Sign in to leave a comment'}</p>
              <Link to="/login" className="btn primary">{vp.signIn || 'Sign In'}</Link>
            </div>
          )}
        </div>
        <div className="card" style={{
          border: '1px solid var(--line)',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '18px',
          padding: '12px',
        }}>
          <div className="hrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>{vp.commentsTitle || 'Comments'}</h3>
            <span className="muted" style={{ fontSize: '12px' }}>{previewComments.length}</span>
          </div>

          {previewComments.length === 0 ? (
            <div className="muted" style={{ fontSize: '12px' }}>
              {vp.noComments || 'No comments yet. Be the first!'}
            </div>
          ) : (
            <div className="commentList" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {previewComments.map((c, index) => (
                <div key={c.id || index} className="comment" style={{
                  border: '1px solid rgba(234,240,255,0.10)',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '16px',
                  padding: '10px',
                }}>
                  <div className="cTop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span className="cName" style={{ fontWeight: 800, fontSize: '13px' }}>
                      @{c.User?.email?.split('@')[0] || 'User'}
                    </span>
                    <span className="cTime" style={{ fontSize: '12px', color: 'rgba(234,240,255,0.60)', fontVariantNumeric: 'tabular-nums' }}>
                      {c.createdAt ? formatDate(c.createdAt) : (vp.justNow || 'Just now')}
                    </span>
                  </div>
                  <p className="cText" style={{
                    margin: '8px 0 0',
                    color: 'rgba(234,240,255,0.80)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    ) : (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '220px',
        color: 'var(--muted)',
        gap: '12px',
        borderBottom: '1px solid var(--line)',
        marginBottom: '12px',
        paddingBottom: '16px',
      }}>
        <span style={{ fontSize: '48px' }}>🎬</span>
        <h2 style={{ margin: 0, fontSize: '16px' }}>{cd.selectAVideo || 'Select a video'}</h2>
        <p style={{ margin: 0, fontSize: '13px' }}>{cd.selectToPreview || 'Click a leaderboard row to load the preview.'}</p>
      </div>
    )
  );

  const renderLeaderboard = () => (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: '4px 6px 12px',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontWeight: 900, letterSpacing: '-0.2px' }}>{cd.leaderboard || 'Leaderboard'}</div>
          <div className="muted" style={{ fontSize: '12px' }}>
            {filteredVideos.length} {cd.videosShown || 'videos shown'} • {cd.rankedByLikes || 'ranked by likes'}
          </div>
        </div>
        <span className="pill">
          <span className="dot" style={{
            width: '8px',
            height: '8px',
            borderRadius: '999px',
            background: 'var(--good)',
            boxShadow: '0 0 0 5px rgba(70,230,165,0.15)',
          }}></span>
          {cd.updatedLive || 'Updated live'}
        </span>
      </div>

      {filteredVideos.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
          {cd.noVideos || 'No videos in this campaign yet.'}
        </div>
      ) : (
        <div
          id="rows"
          style={{
            maxHeight: '336px',
            overflowY: 'auto',
            paddingRight: '4px',
          }}
        >
          {filteredVideos.map((video, index) => (
              <div
                key={video.id}
                className="row leaderboard-row"
                onClick={() => handlePreviewSelect(video)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '18px',
                  border: previewVideo?.id === video.id
                    ? '1px solid rgba(124,92,255,0.4)'
                    : '1px solid rgba(234,240,255,0.10)',
                  background: previewVideo?.id === video.id
                    ? 'rgba(124,92,255,0.08)'
                    : 'rgba(255,255,255,0.04)',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, background 0.15s ease, border-color 0.15s ease',
                }}
              >
                {/* Top row: Rank, Thumbnail, Points */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="rank" style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    background: index < 3
                      ? 'linear-gradient(135deg, rgba(124,92,255,0.3), rgba(25,211,255,0.2))'
                      : 'rgba(124,92,255,0.18)',
                    border: '1px solid rgba(124,92,255,0.26)',
                    color: 'rgba(234,240,255,0.92)',
                    fontSize: index < 3 ? '16px' : '13px',
                    flexShrink: 0,
                  }}>
                    {getRankBadge(index)}
                  </div>
                  <div style={{
                    width: '54px',
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'rgba(0,0,0,0.22)',
                  }}>
                    {renderVideoThumb(video)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '13px', 
                      fontWeight: 800, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      color: 'var(--text)'
                    }}>
                      {video.title}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      @{video.User?.email?.split('@')[0] || 'User'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '2px',
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}>
                      <strong style={{ fontSize: '16px', lineHeight: 1, color: '#19D3FF' }}>
                        {formatNumber(getPointCount(video))}
                      </strong>
                      <span style={{ fontSize: '11px', lineHeight: 1.2, color: '#19D3FF', fontWeight: 800 }}>
                        {cd.points || 'Points'}
                      </span>
                    </div>
                  </div>
                
                {/* Bottom row: Stats */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  flexWrap: 'wrap',
                  paddingLeft: '50px'
                }}>
                  <span className="chip" style={{
                    padding: '4px 8px',
                    borderRadius: '999px',
                    border: '1px solid var(--line)',
                    background: 'rgba(255,255,255,0.04)',
                    fontSize: '11px',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    ❤️ {formatNumber(getLikeCount(video))}
                  </span>
                  <span className="chip" style={{
                    padding: '4px 8px',
                    borderRadius: '999px',
                    border: '1px solid var(--line)',
                    background: 'rgba(255,255,255,0.04)',
                    fontSize: '11px',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    🌸 {formatNumber(getFlowerCount(video))}
                  </span>
                  {video.category && (
                    <span className="chip" style={{
                      padding: '4px 8px',
                      borderRadius: '999px',
                      border: '1px solid var(--line)',
                      background: 'rgba(255,255,255,0.04)',
                      fontSize: '11px',
                    }}>
                      {video.category}
                    </span>
                  )}
                </div>
              </div>
          ))}
        </div>
      )}
    </>
  );

  const renderCampaignControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input
        className="campaign-search-input"
        placeholder={cd.searchPlaceholder || 'Search by title, creator, tag...'}
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={{ width: '100%', minWidth: 0 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
        <select
          className="select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            border: '1px solid var(--line)',
            background: 'var(--bg)',
            color: 'var(--text)',
            borderRadius: '14px',
            padding: '10px 12px',
            minWidth: 0,
            width: '75%',
            justifySelf: 'start',
          }}
        >
          <option value="likes_desc">{cd.sortLikesHigh || 'Sort: Likes (high to low)'}</option>
          <option value="likes_asc">{cd.sortLikesLow || 'Sort: Likes (low to high)'}</option>
          <option value="title_asc">{cd.sortTitle || 'Sort: Title (A to Z)'}</option>
          <option value="creator_asc">{cd.sortCreator || 'Sort: Creator (A to Z)'}</option>
        </select>
        <button onClick={handleReset} className="btn" title={cd.refresh || 'Refresh'}>🔄 {cd.refresh || 'Refresh'}</button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Header />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 'calc(100vh - 64px)',
          color: 'var(--muted)',
        }}>
          {cd.loadingCampaign || 'Loading campaign...'}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Header />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 'calc(100vh - 64px)',
          color: 'var(--muted)',
        }}>
          {cd.notFound || 'Campaign not found'}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(rgba(7,10,22,0.52), rgba(7,10,22,0.62)), url("/img/background_campaign.png")',
      backgroundSize: '100% auto',
      backgroundPosition: 'top center',
      backgroundAttachment: 'fixed',
    }}>
      <Header />

      <main className="wrap" style={{ maxWidth: '1180px', margin: '0 auto', padding: '18px' }}>
        {/* Campaign Banner */}
        {campaign.bannerUrl && (
          <div style={{
            width: '100%',
            height: 'auto',
            marginBottom: '16px',
            borderRadius: 'var(--r22)',
            overflow: 'hidden',
          }}>
            <img
              src={getMediaUrl(campaign.bannerUrl)}
              alt={campaign.name}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        {/* Campaign Instructions Image */}
        {campaign.instructionsImageUrl && (
          <div style={{
            width: '100%',
            height: 'auto',
            marginBottom: '16px',
            borderRadius: 'var(--r22)',
            overflow: 'hidden',
            border: '1px solid var(--line)',
          }}>
            <img
              src={getMediaUrl(campaign.instructionsImageUrl)}
              alt={`${campaign.name} Instructions`}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        <section className="announce" style={{
          position: 'relative',
          padding: '14px 16px',
          borderRadius: 'var(--r22)',
          border: '1px solid rgba(234,240,255,0.14)',
          background: `
            radial-gradient(700px 400px at 20% 20%, rgba(25,211,255,0.18), transparent 60%),
            radial-gradient(780px 420px at 80% 30%, rgba(124,92,255,0.22), transparent 65%),
            rgba(255,255,255,0.05)
          `,
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div style={{ minWidth: 0, flex: '1 1 280px' }}>
            <div className="muted" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                background: isCampaignActive ? 'var(--good)' : 'var(--bad)',
                boxShadow: isCampaignActive ? '0 0 0 5px rgba(70,230,165,0.16)' : '0 0 0 5px rgba(255,77,109,0.16)',
                flexShrink: 0,
              }}></span>
              {cd.campaignLive || 'Campaign live'}
            </div>
            <h1 style={{
              margin: 0,
              fontSize: 'clamp(20px, 2.4vw, 30px)',
              letterSpacing: '-0.3px',
              lineHeight: 1.12,
            }}>
              {campaign.name}
            </h1>
          </div>

          <div style={{
            flex: '0 0 auto',
            minWidth: '220px',
            padding: '10px 12px',
            borderRadius: '16px',
            border: '1px solid rgba(234,240,255,0.14)',
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <img
              src="/img/trophy.png"
              alt=""
              aria-hidden="true"
              style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0 }}
            />
            <div style={{
              color: 'rgba(234,240,255,0.86)',
              fontSize: 'clamp(15px, 1.6vw, 20px)',
              fontWeight: 600,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}>
              {deadline.ended ? (lang === 'zh' ? '已结束' : lang === 'es' ? 'Finalizado' : 'Ended') : (t.campaigns?.endsOn || 'Ends on')}: {deadline.date}
            </div>
          </div>
        </section>


        <section className="campaign-grid">
          <section className="panel list" style={{ padding: '12px' }}>
            {renderPreviewPlayer()}

          </section>

          <aside className="panel right-column" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {renderCampaignControls()}

            {renderLeaderboard()}

            <JoinVideoSidebar
              myVideos={myVideos}
              selectedVideoId={selectedVideoId}
              setSelectedVideoId={setSelectedVideoId}
              handleJoin={handleJoin}
              titleText={cd.selectYourVideo || 'Select video to join campaign'}
              buttonText={cd.joinCampaign || 'Join Compaign'}
              placeholderText={cd.searchPlaceholder || '-- Buscar video --'}
            />
          </aside>
        </section>

        <footer style={{
          padding: '24px 0 10px',
          color: 'rgba(234,240,255,0.55)',
          fontSize: '12px',
          textAlign: 'center',
        }}>
          © {new Date().getFullYear()} Hurammy.com — {cd.campaignPage || 'Campaign page'}
        </footer>
      </main>

      {showFlowerModal && (
        <div className="modal-overlay" onClick={() => setShowFlowerModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            background: '#1a1a1a', padding: '24px', borderRadius: '12px',
            width: '90%', maxWidth: '360px', color: '#fff',
            display: 'flex', flexDirection: 'column', gap: '16px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>{vp.giveFlowers || 'Give Flowers'}</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
              {vp.supportCreator || 'Support the creator by giving flowers. Each flower costs 10 WAi coins.'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', margin: '10px 0' }}>
              <button
                onClick={() => setFlowersToGive(Math.max(1, flowersToGive - 1))}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}
              >-</button>
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{flowersToGive} 🌸</span>
              <button
                onClick={() => setFlowersToGive(flowersToGive + 1)}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}
              >+</button>
            </div>

            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{vp.totalCost || 'Total Cost:'}</span>
              <b style={{ whiteSpace: 'nowrap' }}>{flowersToGive * 10} WAi Coins</b>
            </div>

            <div style={{ padding: '0 12px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              <span>{vp.yourBalance || 'Your Balance:'}</span>
              <span style={{ whiteSpace: 'nowrap' }}>{user?.waiCoins || 0} WAi Coins</span>
            </div>

            {(flowersToGive * 10) > (user?.waiCoins || 0) && (
              <div style={{
                padding: '12px',
                background: 'rgba(255, 77, 109, 0.1)',
                border: '1px solid rgba(255, 77, 109, 0.3)',
                borderRadius: '8px',
                color: '#FF4D6D',
                fontSize: '13px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                {vp.insufficientCoinsAlert || '⚠️ Insufficient WAi Coins. Please top up your balance.'}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => setShowFlowerModal(false)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >{vp.cancel || 'Cancel'}</button>
              <button
                onClick={handleGiveFlowersSubmit}
                disabled={(flowersToGive * 10) > (user?.waiCoins || 0)}
                style={{ flex: 1, padding: '10px', background: ((flowersToGive * 10) > (user?.waiCoins || 0)) ? 'rgba(255,255,255,0.1)' : '#FF4D6D', border: 'none', color: ((flowersToGive * 10) > (user?.waiCoins || 0)) ? 'rgba(255,255,255,0.3)' : '#fff', borderRadius: '8px', cursor: ((flowersToGive * 10) > (user?.waiCoins || 0)) ? 'not-allowed' : 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
              >{vp.confirm || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast.show ? 'show' : ''}`}>
        {toast.message}
      </div>
    </div>
  );
}

export default CampaignDetail;
