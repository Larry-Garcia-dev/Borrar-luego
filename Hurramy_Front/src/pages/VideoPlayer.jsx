import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import RightPanel from '../components/RightPanel';
import ShareModal from '../components/ShareModal';
import { translations } from '../utils/translations';
import { API_URL } from '../config';
import { getVideoUrl, getThumbnailUrl } from '../utils/mediaUtils'; 

/* ── SVG icon helpers ──────────────────────────────── */
const Ico = ({ children, size = 16, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} {...p}>
    {children}
  </svg>
);

const PlayIcon = () => (<Ico><polygon points="5 3 19 12 5 21 5 3" /></Ico>);
const PauseIcon = () => (<Ico><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></Ico>);
const SkipBackIcon = () => (<Ico><polygon points="11 19 2 12 11 5 11 19" /><line x1="22" y1="12" x2="11" y2="12" /></Ico>);
const SkipFwdIcon = () => (<Ico><polygon points="13 19 22 12 13 5 13 19" /><line x1="2" y1="12" x2="13" y2="12" /></Ico>);
const PrevVideoIcon = () => (<Ico><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></Ico>);
const NextVideoIcon = () => (<Ico><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></Ico>);
const VolXIcon = () => (<Ico><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></Ico>);
const Vol2Icon = () => (<Ico><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></Ico>);
const MaxIcon = () => (<Ico><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></Ico>);
const MinIcon = () => (<Ico><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></Ico>);
const SettingsIcon = () => (<Ico><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></Ico>);
const HeartIcon = ({ filled }) => (
  <Ico size={15}>
    <path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      fill={filled ? '#FF4D6D' : 'none'}
      stroke={filled ? '#FF4D6D' : 'currentColor'}
    />
  </Ico>
);
const ShareIcon = () => (<Ico size={14}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></Ico>);
const FlowerIcon = () => (<span style={{ fontSize: '15px', lineHeight: '1' }}>🌸</span>);

function VideoPlayer() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [allVideos, setAllVideos] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [videoFlowers, setVideoFlowers] = useState(0);
  const [showFlowerModal, setShowFlowerModal] = useState(false);
  const [flowersToGive, setFlowersToGive] = useState(1);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [statusLabel, setStatusLabel] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFsControls, setShowFsControls] = useState(true);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const videoRef = useRef(null);
  const seekRef = useRef(null);
  const playerRef = useRef(null);
  const fsControlsTimeout = useRef(null);
  const speedMenuRef = useRef(null);
  const lastCountedVideoId = useRef(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const vp = t.videoPlayer || {};

  // Handle search from VideoPlayer - only navigate to home on form submit (Enter key)
  // Video suggestions are handled directly by Header's handleSuggestionClick
  const handleSearch = (query, isSubmit = false) => {
    if (isSubmit && query && query.trim()) {
      navigate(`/?search=${encodeURIComponent(query.trim())}`);
    }
  };

  // Reset autoplay state when video ID changes (navigating to new video)
  useEffect(() => {
    setHasAutoPlayed(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [id]);

  useEffect(() => {
    setStatusLabel(vp.ready || 'Ready');
  }, [lang]);

  useEffect(() => {
    loadVideo();
    loadAllVideos();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (!isTyping && videoRef.current) {
        if (e.key === ' ') { e.preventDefault(); togglePlay(); }
        if (e.key.toLowerCase() === 'j') jump(-10);
        if (e.key.toLowerCase() === 'k') jump(10);
        if (e.key.toLowerCase() === 'm') toggleMute();
        if (e.key.toLowerCase() === 'f') handleFullscreen();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement?.id === 'commentInput') {
          handleComment(e);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted]);

  const loadVideo = () => {
    // CORRECCIÓN: Usamos API_URL en lugar de localhost
    axios.get(`${API_URL}/videos/${id}`)
      .then(res => {
        setVideo(res.data);
        setLikes(res.data.Likes?.length || 0);
        setComments(res.data.Comments || []);
        setVideoFlowers(res.data.flowers || 0);
        if (user && res.data.Likes) {
          setIsLiked(res.data.Likes.some(like => like.userId === user.id));
        }
      })
      .catch(err => console.error("Error cargando video:", err));
  };

  const loadAllVideos = () => {
    // CORRECCIÓN: Usamos API_URL en lugar de localhost
    axios.get(`${API_URL}/videos`)
      .then(res => {
        // Handle paginated response
        const videos = res.data.videos || res.data;
        setAllVideos(Array.isArray(videos) ? videos : []);
      })
      .catch(() => {});
  };

  // Get video list for navigation (excluding current video)
  const getVideoList = () => {
    const videos = Array.isArray(allVideos) ? allVideos : [];
    return videos.filter(v => String(v.id) !== String(id));
  };

  // Get current video index in the list
  const getCurrentVideoIndex = () => {
    const videos = Array.isArray(allVideos) ? allVideos : [];
    return videos.findIndex(v => String(v.id) === String(id));
  };

  // Navigate to previous video
  const goToPrevVideo = () => {
    const videos = Array.isArray(allVideos) ? allVideos : [];
    const currentIndex = getCurrentVideoIndex();
    if (currentIndex > 0) {
      const prevVideo = videos[currentIndex - 1];
      navigate(`/watch/${prevVideo.id}`);
    } else if (videos.length > 1) {
      // Loop to last video
      const lastVideo = videos[videos.length - 1];
      navigate(`/watch/${lastVideo.id}`);
    }
  };

  // Navigate to next video
  const goToNextVideo = () => {
    const videos = Array.isArray(allVideos) ? allVideos : [];
    const currentIndex = getCurrentVideoIndex();
    if (currentIndex < videos.length - 1 && currentIndex !== -1) {
      const nextVideo = videos[currentIndex + 1];
      navigate(`/watch/${nextVideo.id}`);
    } else if (videos.length > 1) {
      // Loop to first video
      const firstVideo = videos[0];
      navigate(`/watch/${firstVideo.id}`);
    }
  };

  // Check if navigation is available
  const canNavigate = () => {
    const videos = Array.isArray(allVideos) ? allVideos : [];
    return videos.length > 1;
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    
    if (vid.paused) {
      // Immediately update UI for responsiveness
      setIsPlaying(true);
      setStatusLabel(vp.playing || 'Playing');
      vid.play().catch(() => {
        setIsPlaying(false);
        setStatusLabel(vp.paused || 'Paused');
        showToast(vp.autoplayBlocked || 'Autoplay blocked');
      });
    } else {
      // Immediately update UI for responsiveness
      setIsPlaying(false);
      setStatusLabel(vp.paused || 'Paused');
      vid.pause();
    }
  };

  const jump = (seconds) => {
    const vid = videoRef.current;
    if (!vid) return;
    const newTime = Math.max(0, Math.min(vid.duration || Infinity, vid.currentTime + seconds));
    vid.currentTime = newTime;
    // Immediately update UI for responsiveness
    setCurrentTime(newTime);
    showToast(`${seconds > 0 ? '+' : ''}${seconds}s`);
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    
    const newMuted = !vid.muted;
    vid.muted = newMuted;
    
    if (!newMuted && vid.volume === 0) {
      vid.volume = 0.7;
    }
    
    // Immediately update UI for responsiveness
    setIsMuted(newMuted);
    setVolume(newMuted ? 0 : vid.volume);
    showToast(newMuted ? (vp.muted || 'Muted') : (vp.soundOn || 'Sound on'));
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    const vid = videoRef.current;
    if (vid) {
      vid.volume = v;
      vid.muted = v === 0;
    }
    // Immediately update UI for responsiveness
    setVolume(v);
    setIsMuted(v === 0);
  };

  const handleSeek = (e) => {
    const pct = parseFloat(e.target.value);
    const vid = videoRef.current;
    if (vid && vid.duration) {
      const newTime = (pct / 100) * vid.duration;
      vid.currentTime = newTime;
      // Immediately update UI for responsiveness
      setCurrentTime(newTime);
    }
  };

  const handleFullscreen = async () => {
    const vid = videoRef.current;
    const player = playerRef.current;
    
    // Check if we're already in fullscreen
    const isCurrentlyFullscreen = document.fullscreenElement || 
      document.webkitFullscreenElement || 
      document.mozFullScreenElement ||
      document.msFullscreenElement;
    
    try {
      if (!isCurrentlyFullscreen) {
        // Try standard fullscreen API first (works on desktop and Android)
        if (player?.requestFullscreen) {
          await player.requestFullscreen();
          setIsFullscreen(true);
          setShowFsControls(true);
          resetFsControlsTimeout();
        } 
        // Safari desktop
        else if (player?.webkitRequestFullscreen) {
          await player.webkitRequestFullscreen();
          setIsFullscreen(true);
          setShowFsControls(true);
          resetFsControlsTimeout();
        }
        // iOS Safari - use native video fullscreen (only option on iOS)
        else if (vid?.webkitEnterFullscreen) {
          vid.webkitEnterFullscreen();
          // iOS uses native controls, no need to set our custom state
        }
        // iOS alternative
        else if (vid?.webkitSupportsFullscreen && vid?.webkitEnterFullScreen) {
          vid.webkitEnterFullScreen();
        }
        // Firefox
        else if (player?.mozRequestFullScreen) {
          await player.mozRequestFullScreen();
          setIsFullscreen(true);
        }
        // IE/Edge
        else if (player?.msRequestFullscreen) {
          await player.msRequestFullscreen();
          setIsFullscreen(true);
        }
        else {
          showToast(vp.fullscreenNA || 'Fullscreen not available');
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {
      // Fallback for iOS - try video element directly
      if (vid?.webkitEnterFullscreen) {
        try {
          vid.webkitEnterFullscreen();
        } catch {
          showToast(vp.fullscreenNA || 'Fullscreen not available');
        }
      } else {
        showToast(vp.fullscreenNA || 'Fullscreen not available');
      }
    }
  };

  // Fullscreen change listener (cross-browser)
  useEffect(() => {
    const handleFsChange = () => {
      const inFs = !!(
        document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(inFs);
      if (!inFs) {
        setShowSpeedMenu(false);
      }
    };
    
    // Add all browser-specific fullscreen change listeners
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Hide fullscreen controls after inactivity
  const resetFsControlsTimeout = () => {
    if (fsControlsTimeout.current) clearTimeout(fsControlsTimeout.current);
    setShowFsControls(true);
    fsControlsTimeout.current = setTimeout(() => {
      if (isFullscreen && isPlaying && !isDraggingSeek && !showSpeedMenu) {
        setShowFsControls(false);
      }
    }, 3000);
  };

  const handlePlayerMouseMove = () => {
    if (isFullscreen) {
      resetFsControlsTimeout();
    }
  };

  const handlePlayerClick = (e) => {
    // Only toggle play if clicking directly on video, not on controls
    if (e.target.tagName === 'VIDEO') {
      togglePlay();
    }
  };

  // Close speed menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target)) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fullscreen seek bar drag handlers
  const handleSeekMouseDown = () => {
    setIsDraggingSeek(true);
  };

  const handleSeekMouseUp = () => {
    setIsDraggingSeek(false);
    resetFsControlsTimeout();
  };

  const handleLike = async () => {
    if (!user) {
      showToast(vp.signInToLike || 'Sign in to like');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      
      if (isLiked) {
        await axios.delete(`${API_URL}/videos/${id}/like`, { data: { userId: user.id }, ...authHeaders });
        setLikes(likes - 1);
        setIsLiked(false);
        showToast(vp.unliked || 'Unliked');
      } else {
        await axios.post(`${API_URL}/videos/${id}/like`, { userId: user.id }, authHeaders);
        setLikes(likes + 1);
        setIsLiked(true);
        showToast(vp.liked || 'Liked!');
      }
    } catch (error) {
      showToast(error.response?.data?.message || t.common?.error || 'Error');
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
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
      
      const res = await axios.post(`${API_URL}/videos/${id}/flowers`, {
        userId: user.id,
        flowersCount: flowersToGive
      }, authHeaders);

      setVideoFlowers(res.data.videoFlowersTotal);
      
      // Update local storage user coins
      const updatedUser = { ...user, waiCoins: res.data.remainingCoins };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setShowFlowerModal(false);
      showToast(vp.flowersGiven || 'Flowers given successfully!');
    } catch (error) {
      showToast(error.response?.data?.message || vp.errorGivingFlowers || 'Error giving flowers');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) { showToast(vp.signInToComment || 'Sign in to comment'); return; }
    if (!commentText.trim()) { showToast(vp.writeComment || 'Write a comment first'); return; }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/videos/${id}/comment`, {
        userId: user.id,
        text: commentText
      }, { headers: { Authorization: `Bearer ${token}` } });
      setComments([res.data, ...comments]);
      setCommentText('');
      showToast(vp.commentPosted || 'Comment posted');
    } catch (error) {
      console.error(error);
      showToast(vp.errorComment || 'Error posting comment');
    }
  };

  const handleSpeedChange = (e) => {
    const speed = parseFloat(e.target.value);
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    showToast(`${vp.speed || 'Speed'}: ${speed}x`);
  };

  const handleOpenShare = () => {
    setShareOpen(true);
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 1200);
  };

  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    const locale = lang === 'es' ? 'es-ES' : lang === 'zh' ? 'zh-CN' : 'en-US';
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!video) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: 'var(--muted)',
      }}>
        {vp.loading || t.common?.loading || 'Loading...'}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onSearch={handleSearch} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} videos={allVideos} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main style={{ padding: '18px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="video-player-grid">
              {/* Main Video Section */}
              <section className="panel">
                <div className="videoWrap" style={{ padding: '12px' }}>
                  {/* Video Player */}
                  <div 
                    ref={playerRef}
                    className={`player ${isFullscreen ? 'fs-active' : ''}`}
                    style={{
                      position: 'relative',
                      borderRadius: isFullscreen ? '0' : '20px',
                      overflow: 'hidden',
                      border: isFullscreen ? 'none' : '1px solid var(--line)',
                      background: 'rgba(0,0,0,0.35)',
                      boxShadow: isFullscreen ? 'none' : '0 26px 90px rgba(0,0,0,0.35)',
                      aspectRatio: isFullscreen ? 'auto' : '16/9',
                      width: isFullscreen ? '100%' : undefined,
                      height: isFullscreen ? '100%' : undefined,
                    }}
                    onMouseMove={handlePlayerMouseMove}
                    onClick={handlePlayerClick}
                  >
                    <video
                      ref={videoRef}
                      playsInline
                      preload="auto"
                      crossOrigin="anonymous"
                      src={getVideoUrl(video.videoUrl)}
                      poster={getThumbnailUrl(video.thumbnailUrl) || undefined}
                      style={{ width: '100%', height: '100%', display: 'block', background: '#000', cursor: 'pointer' }}
                      onLoadedMetadata={() => {
                        setDuration(videoRef.current?.duration || 0);
                        setStatusLabel(vp.loaded || 'Loaded');
                        // Auto-play video when it loads
                        if (!hasAutoPlayed && videoRef.current) {
                          videoRef.current.volume = volume;
                          videoRef.current.muted = false;
                          videoRef.current.play()
                            .then(() => setHasAutoPlayed(true))
                            .catch(() => {
                              // Autoplay blocked - try muted autoplay
                              if (videoRef.current) {
                                videoRef.current.muted = true;
                                setIsMuted(true);
                                setVolume(0);
                                videoRef.current.play()
                                  .then(() => setHasAutoPlayed(true))
                                  .catch(() => {});
                              }
                            });
                        }
                      }}
                      onTimeUpdate={() => {
                        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                      }}
                      onPlay={() => {
                        setIsPlaying(true);
                        setStatusLabel(vp.playing || 'Playing');
                        if (lastCountedVideoId.current !== id) {
                          lastCountedVideoId.current = id;
                          axios.post(`${API_URL}/videos/${id}/view`)
                            .then(res => {
                              if (res.data && typeof res.data.views === 'number') {
                                setVideo(prev => prev ? { ...prev, views: res.data.views } : null);
                              }
                            })
                            .catch(err => console.error(err));
                        }
                      }}
                      onPause={() => { setIsPlaying(false); setStatusLabel(vp.paused || 'Paused'); }}
                      onDoubleClick={handleFullscreen}
                    />
                    
                    {/* Fullscreen Button - Bottom Right Corner of Video */}
                    {!isFullscreen && (
                      <button 
                        onClick={handleFullscreen} 
                        className="vp-fullscreen-corner-btn" 
                        title="Fullscreen (F)" 
                        aria-label="Fullscreen"
                      >
                        <MaxIcon />
                      </button>
                    )}

                    {/* Fullscreen Overlay Controls */}
                    {isFullscreen && (
                      <div className={`fs-controls-overlay ${showFsControls ? 'visible' : 'hidden'}`}>
                        {/* Top gradient */}
                        <div className="fs-gradient-top" />

                        {/* Center Play Button (large) */}
                        {!isPlaying && (
                          <div className="fs-center-play" onClick={togglePlay}>
                            <PlayIcon />
                          </div>
                        )}

                        {/* Bottom Controls */}
                        <div className="fs-bottom-controls">
                          {/* Progress Bar */}
                          <div className="fs-progress-container">
                            <span className="fs-time-current">{formatTime(currentTime)}</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={duration ? (currentTime / duration) * 100 : 0}
                              onChange={handleSeek}
                              onMouseDown={handleSeekMouseDown}
                              onMouseUp={handleSeekMouseUp}
                              onTouchStart={handleSeekMouseDown}
                              onTouchEnd={handleSeekMouseUp}
                              className="fs-seek"
                              aria-label="Seek"
                              style={{
                                background: `linear-gradient(to right, var(--brand2) 0%, var(--brand2) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.3) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.3) 100%)`
                              }}
                            />
                            <span className="fs-time-duration">{formatTime(duration)}</span>
                          </div>

                          {/* Controls Row */}
                          <div className="fs-controls-row">
                            {/* Left Controls - Order: Play/Pause, -10s, +10s, Prev Video, Next Video */}
                            <div className="fs-controls-left">
                              <button onClick={togglePlay} className="fs-btn" aria-label={isPlaying ? 'Pause' : 'Play'}>
                                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                              </button>
                              
                              <button onClick={() => jump(-10)} className="fs-btn" aria-label="Back 10s">
                                <SkipBackIcon />
                              </button>
                              <button onClick={() => jump(10)} className="fs-btn" aria-label="Forward 10s">
                                <SkipFwdIcon />
                              </button>
                              
                              {/* Video Navigation - Always visible */}
                              <button 
                                onClick={goToPrevVideo} 
                                className="fs-btn fs-nav-btn" 
                                aria-label={vp.prevVideo || 'Previous video'}
                                disabled={!canNavigate()}
                              >
                                <PrevVideoIcon />
                              </button>
                              <button 
                                onClick={goToNextVideo} 
                                className="fs-btn fs-nav-btn" 
                                aria-label={vp.nextVideo || 'Next video'}
                                disabled={!canNavigate()}
                              >
                                <NextVideoIcon />
                              </button>

                              {/* Volume Controls */}
                              <div className="fs-volume-group">
                                <button onClick={toggleMute} className="fs-btn" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                                  {isMuted ? <VolXIcon /> : <Vol2Icon />}
                                </button>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={volume}
                                  onChange={handleVolumeChange}
                                  className="fs-vol-slider"
                                  aria-label="Volume"
                                  style={{
                                    background: `linear-gradient(to right, #fff 0%, #fff ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%, rgba(255,255,255,0.3) 100%)`
                                  }}
                                />
                              </div>

                              <span className="fs-time-display">
                                {formatTime(currentTime)} / {formatTime(duration)}
                              </span>
                            </div>

                            {/* Right Controls */}
                            <div className="fs-controls-right">
                              {/* Speed Menu */}
                              <div className="fs-speed-wrapper" ref={speedMenuRef}>
                                <button 
                                  onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                                  className="fs-btn fs-speed-btn"
                                  aria-label="Playback Speed"
                                >
                                  {playbackSpeed}x
                                </button>
                                {showSpeedMenu && (
                                  <div className="fs-speed-menu">
                                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                                      <button
                                        key={speed}
                                        className={`fs-speed-option ${playbackSpeed === speed ? 'active' : ''}`}
                                        onClick={() => {
                                          const newSpeed = speed;
                                          setPlaybackSpeed(newSpeed);
                                          if (videoRef.current) videoRef.current.playbackRate = newSpeed;
                                          setShowSpeedMenu(false);
                                          showToast(`${vp.speed || 'Speed'}: ${newSpeed}x`);
                                        }}
                                      >
                                        {speed === 1 ? (vp.normal || 'Normal') : `${speed}x`}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Fullscreen Exit Button - Bottom Right Corner */}
                        <button 
                          onClick={handleFullscreen} 
                          className="fs-fullscreen-corner-btn" 
                          aria-label="Exit Fullscreen"
                        >
                          <MinIcon />
                        </button>

                        {/* Bottom gradient */}
                        <div className="fs-gradient-bottom" />
                      </div>
                    )}
                  </div>

                  {/* Custom Controls */}
                  <div className="vp-controls">
                    {/* Seek Bar */}
                    <input
                      ref={seekRef}
                      type="range"
                      min="0"
                      max="100"
                      value={duration ? (currentTime / duration) * 100 : 0}
                      onChange={handleSeek}
                      className="vp-seek"
                      aria-label="Seek"
                      style={{
                        background: `linear-gradient(to right, var(--brand2) 0%, var(--brand2) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(234,240,255,0.15) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(234,240,255,0.15) 100%)`
                      }}
                    />

                    {/* Controls Row */}
                    <div className="vp-controls-row">
                      {/* Order: Play/Pause, -10s, +10s, Prev Video, Next Video */}
                      <button onClick={togglePlay} className="iconBtn vp-icon-btn" title="Play/Pause (Space)" aria-label={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                      </button>
                      
                      <button onClick={() => jump(-10)} className="iconBtn vp-icon-btn" title="Back 10s (J)" aria-label="Back 10 seconds">
                        <SkipBackIcon />
                      </button>
                      <button onClick={() => jump(10)} className="iconBtn vp-icon-btn" title="Forward 10s (K)" aria-label="Forward 10 seconds">
                        <SkipFwdIcon />
                      </button>
                      
                      {/* Video Navigation - Always visible */}
                      <button 
                        onClick={goToPrevVideo} 
                        className="iconBtn vp-icon-btn vp-nav-btn" 
                        title={vp.prevVideo || 'Previous video'} 
                        aria-label={vp.prevVideo || 'Previous video'}
                        disabled={!canNavigate()}
                      >
                        <PrevVideoIcon />
                      </button>
                      <button 
                        onClick={goToNextVideo} 
                        className="iconBtn vp-icon-btn vp-nav-btn" 
                        title={vp.nextVideo || 'Next video'} 
                        aria-label={vp.nextVideo || 'Next video'}
                        disabled={!canNavigate()}
                      >
                        <NextVideoIcon />
                      </button>
                      
                      <button onClick={toggleMute} className="iconBtn vp-icon-btn" title="Mute (M)" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                        {isMuted ? <VolXIcon /> : <Vol2Icon />}
                      </button>

                      <span className="vp-time">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>

                      <span style={{ flex: 1 }} />

                      <label className="vp-label">{vp.speed || 'Speed'}</label>
                      <select
                        value={playbackSpeed}
                        onChange={handleSpeedChange}
                        className="vp-select"
                        title="Playback speed"
                      >
                        <option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1">1x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2x</option>
                      </select>

                      <label className="vp-label">{vp.vol || 'Vol'}</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="vp-vol-slider"
                        style={{
                          background: `linear-gradient(to right, var(--brand2) 0%, var(--brand2) ${volume * 100}%, rgba(234,240,255,0.15) ${volume * 100}%, rgba(234,240,255,0.15) 100%)`
                        }}
                      />
                    </div>

                    {/* Shortcuts Row */}
                    <div className="vp-shortcuts-row">
                      <span>{vp.shortcuts || 'Shortcuts: Space play/pause | J/K +/-10s | M mute | F fullscreen'}</span>
                      <span style={{ color: 'var(--muted)' }}>{statusLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Meta */}
                <div className="meta" style={{ padding: '0 12px 12px' }}>
                  <h1 style={{ margin: '12px 0 6px', fontSize: '18px', letterSpacing: '-0.2px' }}>
                    {video.title}
                  </h1>

                  <div className="metaLine" style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    flexWrap: 'wrap', 
                    alignItems: 'center', 
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontSize: '13px' }}>
                      <span className="muted">{vp.by || 'By'} <b>@{video.User?.email?.split('@')[0] || 'Creator'}</b></span>
                      <span className="muted" style={{ display: 'none' }}>|</span>
                      <span className="muted"><span className="count">{(video.views || 0).toLocaleString()}</span> {vp.views || 'views'}</span>
                    </div>

                    <div className="video-actions-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={handleOpenShare} className="btn video-action-btn" style={{ padding: '8px 12px', fontSize: '12px' }} title={vp.shareVideo || 'Share'}>
                        <ShareIcon /> <span className="action-label">{vp.shareVideo || 'Share'}</span>
                      </button>

                      <button
                        onClick={openFlowerModal}
                        className="likeBtn video-action-btn"
                        role="button"
                        tabIndex={0}
                      >
                        <FlowerIcon />
                        <b><span className="count">{videoFlowers.toLocaleString()}</span></b>
                        <span className="muted action-label">{vp.giveFlowers || 'Flowers'}</span>
                      </button>

                      <button
                        onClick={handleLike}
                        className={`likeBtn video-action-btn ${isLiked ? 'liked' : ''}`}
                        role="button"
                        aria-pressed={isLiked}
                        tabIndex={0}
                      >
                        <HeartIcon filled={isLiked} />
                        <b><span className="count">{likes.toLocaleString()}</span></b>
                        <span className="muted action-label">{isLiked ? (vp.likedBtn || 'Liked') : (vp.like || 'Like')}</span>
                      </button>
                    </div>
                  </div>

                  <p className="muted" style={{ margin: '10px 0 0' }}>
                    {video.description || (vp.noDescription || 'No description provided.')}
                  </p>
                </div>
              </section>

              {/* Sidebar: Comments */}
              <aside className="panel side" style={{ padding: '12px' }}>
                {/* Comment Form */}
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
                          id="commentInput"
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

                      <div className="muted" style={{ fontSize: '12px', marginTop: '10px' }}>
                        {vp.tipComment || 'Tip: Press Ctrl/Cmd + Enter to post.'}
                      </div>
                    </form>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <p className="muted" style={{ marginBottom: '12px' }}>{vp.signInToLeaveComment || 'Sign in to leave a comment'}</p>
                      <Link to="/login" className="btn primary">{vp.signIn || 'Sign In'}</Link>
                    </div>
                  )}
                </div>

                {/* Comments List */}
                <div className="card" style={{
                  border: '1px solid var(--line)',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '18px',
                  padding: '12px',
                }}>
                  <div className="hrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px' }}>{vp.commentsTitle || 'Comments'}</h3>
                    <span className="muted" style={{ fontSize: '12px' }}>{comments.length}</span>
                  </div>

                  {comments.length === 0 ? (
                    <div className="muted" style={{ fontSize: '12px' }}>
                      {vp.noComments || 'No comments yet. Be the first!'}
                    </div>
                  ) : (
                    <div className="commentList" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {comments.map((c, index) => (
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
              </aside>
            </div>
          </div>
        </main>

        <RightPanel videos={allVideos} />
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        url={window.location.href}
        title={video?.title || ''}
      />

      {/* Flower Modal */}
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

      {/* Toast */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>
        {toast.message}
      </div>
    </div>
  );
}

export default VideoPlayer;
