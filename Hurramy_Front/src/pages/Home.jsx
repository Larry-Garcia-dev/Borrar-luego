import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import RightPanel from '../components/RightPanel';
import Header from '../components/Header';
import ShareModal from '../components/ShareModal';
import { translations } from '../utils/translations';
import { API_URL } from '../config';
import { getVideoUrl, getThumbnailUrl, getMediaUrl } from '../utils/mediaUtils';

const ROTATE_MS = 6000;
const BANNER_ROTATE_MS = 5000; // Banner carousel rotation time
const ENDING_SOON_DAYS = 3; // campaigns ending within 3 days get special color

function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [likedVideos, setLikedVideos] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shareModal, setShareModal] = useState({ open: false, url: '', title: '' });
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  
  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  const [announceOpen, setAnnounceOpen] = useState(false);
  const [exploreOpen] = useState(false);
  const [allAnnouncements, setAllAnnouncements] = useState([]);
  const [annIdx, setAnnIdx] = useState(0);
  const timerRef = useRef(null);
  const progressRef = useRef(null);

  // Banner carousel state
  const [bannerCampaigns, setBannerCampaigns] = useState([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerTimerRef = useRef(null);
  const bannerDragRef = useRef({ startX: 0, isDragging: false });

  const user = JSON.parse(localStorage.getItem('user'));
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const ann = t.campaignAnnounce || {};
  const sysAnn = t.systemAnnounce || {};

  const categories = [
    { key: 'all', label: t.home.all },
    { key: 'Gaming', label: t.home.gaming },
    { key: 'Trending', label: t.home.trending },
    { key: 'Tutorials', label: t.home.tutorials },
    { key: 'Clips', label: t.home.clips },
    { key: 'Highlights', label: t.home.highlights },
  ];

  useEffect(() => {
    loadVideos();
  }, []);

  // Load campaigns for banner carousel and announcements
  useEffect(() => {
    loadCampaignAnnouncements();
  }, []);

  useEffect(() => {
    applyFilters(searchQuery);
  }, [activeCategory, videos, searchQuery]);
  
  // Apply initial search from URL params when videos load
  useEffect(() => {
    if (initialSearch && videos.length > 0) {
      applyFilters(initialSearch);
    }
  }, [videos.length]);

  /* ── Build system (static) announcements ── */
  const buildSystemAnnouncements = () => {
    return [
      { _sys: true, type: 'feature', sysKey: 'aiVideoGeneration' },
      { _sys: true, type: 'feature', sysKey: 'customThumbnails' },
      { _sys: true, type: 'improvement', sysKey: 'cdnPerformance' },
      { _sys: true, type: 'maintenance', sysKey: 'maintenance' },
      { _sys: true, type: 'feature', sysKey: 'creatorRewards' },
      { _sys: true, type: 'feature', sysKey: 'sharePlatforms' },
    ];
  };

  /* ── Load campaigns and merge with system announcements ── */
  const loadCampaignAnnouncements = () => {
    const systemItems = buildSystemAnnouncements();

    axios.get(`${API_URL}/campaigns`)
      .then(res => {
        const now = new Date();
        const active = (res.data || []).filter(c => {
          const end = new Date(c.endDate);
          return c.status === 'Active' && end >= now;
        });

        const campaignItems = [];
        const sorted = [...active].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Most recent campaign
        if (sorted[0]) {
          campaignItems.push({ ...sorted[0], type: 'new', _sys: false });
        }

        // Ending soon (within ENDING_SOON_DAYS)
        const ending = active
          .filter(c => {
            const daysLeft = (new Date(c.endDate) - now) / (1000 * 60 * 60 * 24);
            return daysLeft <= ENDING_SOON_DAYS && daysLeft >= 0;
          })
          .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
        ending.forEach(c => {
          if (!campaignItems.find(i => i.id === c.id)) {
            campaignItems.push({ ...c, type: 'ending', _sys: false });
          } else {
            const idx = campaignItems.findIndex(i => i.id === c.id);
            if (idx !== -1) campaignItems[idx].type = 'ending';
          }
        });

        // Popular: oldest active campaign
        if (sorted.length >= 2) {
          const popular = sorted[sorted.length - 1];
          if (!campaignItems.find(i => i.id === popular.id)) {
            campaignItems.push({ ...popular, type: 'popular', _sys: false });
          }
        }

        // Remaining campaigns
        active.forEach(c => {
          if (!campaignItems.find(i => i.id === c.id)) {
            campaignItems.push({ ...c, type: 'new', _sys: false });
          }
        });

        // Interleave: campaigns first (ending first), then system announcements
        const endingFirst = campaignItems.filter(c => c.type === 'ending');
        const rest = campaignItems.filter(c => c.type !== 'ending');
        setAllAnnouncements([...endingFirst, ...rest, ...systemItems]);

        // Set banner campaigns (only campaigns with banners)
        const campaignsWithBanners = active.filter(c => c.bannerUrl);
        setBannerCampaigns(campaignsWithBanners);
      })
      .catch(() => {
        // If campaigns fail, still show system announcements
        setAllAnnouncements(systemItems);
        setBannerCampaigns([]);
      });
  };

  /* ── Announcement rotation ── */
  const totalAnn = allAnnouncements.length;

  const startProgress = useCallback(() => {
    if (!progressRef.current || totalAnn === 0) return;
    progressRef.current.style.transition = 'none';
    progressRef.current.style.width = '0%';
    requestAnimationFrame(() => {
      if (!progressRef.current) return;
      progressRef.current.style.transition = `width ${ROTATE_MS}ms linear`;
      progressRef.current.style.width = '100%';
    });
  }, [totalAnn]);

  useEffect(() => {
    if (!announceOpen || totalAnn === 0) { clearInterval(timerRef.current); return; }
    startProgress();
    timerRef.current = setInterval(() => {
      setAnnIdx(prev => (prev + 1) % totalAnn);
      startProgress();
    }, ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [announceOpen, startProgress, totalAnn]);

  // Banner carousel auto-rotation (5 seconds)
  const totalBannerSlides = bannerCampaigns.length + 1; // +1 for main banner
  useEffect(() => {
    if (totalBannerSlides <= 1) return;
    bannerTimerRef.current = setInterval(() => {
      setBannerIdx(prev => (prev + 1) % totalBannerSlides);
    }, BANNER_ROTATE_MS);
    return () => clearInterval(bannerTimerRef.current);
  }, [totalBannerSlides]);

  const nextBanner = () => {
    setBannerIdx(prev => (prev + 1) % totalBannerSlides);
    clearInterval(bannerTimerRef.current);
    bannerTimerRef.current = setInterval(() => {
      setBannerIdx(prev => (prev + 1) % totalBannerSlides);
    }, BANNER_ROTATE_MS);
  };

  const prevBanner = () => {
    setBannerIdx(prev => (prev - 1 + totalBannerSlides) % totalBannerSlides);
    clearInterval(bannerTimerRef.current);
    bannerTimerRef.current = setInterval(() => {
      setBannerIdx(prev => (prev + 1) % totalBannerSlides);
    }, BANNER_ROTATE_MS);
  };

  // Mouse drag handlers for banner carousel
  const handleBannerMouseDown = (e) => {
    bannerDragRef.current.startX = e.clientX;
    bannerDragRef.current.isDragging = true;
    clearInterval(bannerTimerRef.current);
  };

  const handleBannerMouseUp = (e) => {
    if (!bannerDragRef.current.isDragging) return;
    const diff = e.clientX - bannerDragRef.current.startX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        prevBanner();
      } else {
        nextBanner();
      }
    } else {
      // Restart timer if no slide change
      bannerTimerRef.current = setInterval(() => {
        setBannerIdx(prev => (prev + 1) % totalBannerSlides);
      }, BANNER_ROTATE_MS);
    }
    bannerDragRef.current.isDragging = false;
  };

  const handleBannerMouseLeave = () => {
    if (bannerDragRef.current.isDragging) {
      bannerDragRef.current.isDragging = false;
      bannerTimerRef.current = setInterval(() => {
        setBannerIdx(prev => (prev + 1) % totalBannerSlides);
      }, BANNER_ROTATE_MS);
    }
  };

  // Helper to get campaign banner URL - uses centralized mediaUtils
  const getCampaignBannerUrl = (url) => {
    if (!url) return null;
    return getMediaUrl(url);
  };

  const setAnn = (i) => {
    if (totalAnn === 0) return;
    setAnnIdx(((i % totalAnn) + totalAnn) % totalAnn);
    clearInterval(timerRef.current);
    startProgress();
    timerRef.current = setInterval(() => {
      setAnnIdx(prev => (prev + 1) % totalAnn);
      startProgress();
    }, ROTATE_MS);
  };

  const getDaysLeft = (endDate) => {
    const ms = new Date(endDate) - new Date();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return days;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(lang === 'es' ? 'es-ES' : lang === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const loadVideos = useCallback((pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    axios.get(`${API_URL}/videos?page=${pageNum}&limit=6`)
      .then(response => {
        const { videos: newVideos, hasMore: more, currentPage } = response.data;
        
        if (append && pageNum > 1) {
          // Append new videos to existing list
          setVideos(prev => [...prev, ...newVideos]);
          setFilteredVideos(prev => [...prev, ...newVideos]);
        } else {
          // Replace videos (first page load)
          setVideos(newVideos);
          setFilteredVideos(newVideos);
        }
        
        setPage(currentPage);
        setHasMore(more);

        // Initialize liked state from existing likes for the current user
        if (user) {
          const liked = {};
          const allVideos = append ? [...videos, ...newVideos] : newVideos;
          allVideos.forEach(v => {
            if (v.Likes && v.Likes.some(l => l.userId === user.id)) {
              liked[v.id] = true;
            }
          });
          setLikedVideos(prev => append ? { ...prev, ...liked } : liked);
        }
      })
      .catch(error => console.error(error))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [user, videos]);

  // Load more when scrolling to the bottom
  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore) {
      loadVideos(page + 1, true);
    }
  }, [inView, hasMore, loading, loadingMore, page]);

  const applyFilters = (query = '') => {
    let list = videos;
    if (activeCategory !== 'all') {
      list = list.filter(v => v.category === activeCategory);
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(v =>
        v.title?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        (v.User?.email && v.User.email.toLowerCase().includes(q))
      );
    }
    setFilteredVideos(list);
  };

  const handleSearch = (query, isSubmit = false) => {
    setSearchQuery(query);
    applyFilters(query);
    // Update URL search params only on submit
    if (isSubmit) {
      if (query && query.trim()) {
        setSearchParams({ search: query.trim() });
      } else {
        setSearchParams({});
      }
    }
  };

  const handleShare = (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/watch/${video.id}`;
    setShareModal({ open: true, url, title: video.title || '' });
  };

  const handleLike = async (e, video) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast(t.home.signInToLike);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/videos/${video.id}/toggle-like`, { userId: user.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const nowLiked = res.data?.liked ?? !likedVideos[video.id];
      setLikedVideos(prev => ({ ...prev, [video.id]: nowLiked }));

      // Update the like count in real-time
      const updateList = (list) => list.map(v => {
        if (v.id === video.id) {
          const currentCount = v.Likes?.length || 0;
          const newCount = nowLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
          return { ...v, Likes: Array(newCount).fill({}) };
        }
        return v;
      });

      setVideos(prev => updateList(prev));
      setFilteredVideos(prev => updateList(prev));

      showToast(nowLiked ? t.home.liked : t.home.likeRemoved);
    } catch (error) {
      showToast(error.response?.data?.message || t.home.errorLike || 'Error');
    }
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2000);
  };

  const formatCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count;
  };

  const getFlowerCount = (video) => video?.flowers ?? video?.flowerCount ?? video?.Flowers?.length ?? 0;

  const getCreatorName = (video) => {
    return video.User?.email?.split('@')[0] || 'creator';
  };

  const getVideoThumbnail = (video) => {
    return getThumbnailUrl(video.thumbnailUrl);
  };

  const getVideoSrc = (video) => {
    return getVideoUrl(video.videoUrl);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        onSearch={handleSearch}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        videos={videos}
        initialQuery={searchQuery}
        onOpenInstructions={() => setInstructionsOpen(true)}
      />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Banner Carousel - hidden on mobile */}
      <section 
        className="major_announcement banner-carousel" 
        aria-label="Banner carousel"
        onMouseDown={handleBannerMouseDown}
        onMouseUp={handleBannerMouseUp}
        onMouseLeave={handleBannerMouseLeave}
        style={{ cursor: totalBannerSlides > 1 ? 'grab' : 'default' }}
      >
        {/* Slides */}
        <div className="banner-carousel-slides">
          {/* Main Banner (index 0) */}
          <div className={`banner-carousel-slide${bannerIdx === 0 ? ' active' : ''}`}>
            {/* Default banner background from CSS */}
          </div>

          {/* Campaign Banners */}
          {bannerCampaigns.map((campaign, idx) => (
            <div 
              key={campaign.id}
              className={`banner-carousel-slide banner-carousel-campaign${bannerIdx === idx + 1 ? ' active' : ''}`}
              style={campaign.bannerUrl ? { backgroundImage: `url(${getCampaignBannerUrl(campaign.bannerUrl)})` } : {}}
            >
              <div className="banner-carousel-campaign-content">
                <h2 className="banner-carousel-campaign-title">{campaign.name}</h2>
                {campaign.description && (
                  <p className="banner-carousel-campaign-desc">{campaign.description.substring(0, 100)}{campaign.description.length > 100 ? '...' : ''}</p>
                )}
                <Link to={`/campaign/${campaign.id}`} className="banner-carousel-campaign-btn">
                  {t.home?.viewCampaign || 'View Campaign'}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Dots indicator */}
        {totalBannerSlides > 1 && (
          <div className="banner-carousel-dots">
            {Array.from({ length: totalBannerSlides }).map((_, i) => (
              <button
                key={i}
                className={`banner-carousel-dot${bannerIdx === i ? ' active' : ''}`}
                onClick={() => setBannerIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content - Grid */}
        <main className="home-main-pane" style={{ padding: '18px', overflowY: 'auto' }}>
          {/* Toggle row: Explore Videos + re-open announcements if closed */}
          <div className="home-toggle-row">
            {!announceOpen && totalAnn > 0 && (
              <button
                className="home-toggle-btn"
                onClick={() => setAnnounceOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {sysAnn.announcements || 'Announcements'}
                <span className="home-toggle-badge">{totalAnn}</span>
              </button>
            )}

          </div>

          {/* Announcements carousel -- campaigns + system -- open by default, closable */}
          {announceOpen && totalAnn > 0 && (() => {
            const item = allAnnouncements[annIdx];
            if (!item) return null;

            const isSys = item._sys;

            /* -- Determine visual type class + tag -- */
            let typeClass = '';
            let tagLabel = '';
            let tagClass = '';
            let tagIcon = null;

            const iconPlus = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>;
            const iconClock = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
            const iconStar = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
            const iconWrench = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
            const iconZap = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;

            if (isSys) {
              if (item.type === 'maintenance') {
                typeClass = 'maintenance';
                tagLabel = sysAnn.tagMaintenance || 'Maintenance';
                tagClass = 'maintenance';
                tagIcon = iconWrench;
              } else if (item.type === 'improvement') {
                typeClass = 'improvement';
                tagLabel = sysAnn.tagImprovement || 'Improvement';
                tagClass = 'improvement';
                tagIcon = iconZap;
              } else {
                typeClass = 'feature';
                tagLabel = sysAnn.tagFeature || 'New feature';
                tagClass = 'feature';
                tagIcon = iconPlus;
              }
            } else {
              if (item.type === 'ending') {
                typeClass = 'ending-soon'; tagClass = 'ending'; tagIcon = iconClock;
                tagLabel = ann.tagEnding || 'Ending soon';
              } else if (item.type === 'popular') {
                typeClass = 'popular'; tagClass = 'popular'; tagIcon = iconStar;
                tagLabel = ann.tagPopular || 'Top campaign';
              } else {
                typeClass = ''; tagClass = 'new'; tagIcon = iconPlus;
                tagLabel = ann.tagNew || 'New campaign';
              }
            }

            return (
              <section className={`home-announce ${typeClass}`}>
                <div className="home-announce-header">
                  <span className={`home-announce-tag ${tagClass}`}>
                    {tagIcon}
                    {tagLabel}
                  </span>
                  <button className="home-announce-close" onClick={() => setAnnounceOpen(false)} aria-label="Close">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>

                <div className="home-announce-body">
                  {isSys ? (
                    /* ── System announcement ── */
                    <>
                      <p className="home-announce-name">{sysAnn[item.sysKey] || item.sysKey}</p>
                      <p className="home-announce-desc">{sysAnn[`${item.sysKey}_desc`] || ''}</p>
                    </>
                  ) : (
                    /* ── Campaign announcement ── */
                    <>
                      <p className="home-announce-name">{item.name}</p>
                      {item.description && <p className="home-announce-desc">{item.description}</p>}

                      <div className="home-announce-dates">
                        <span>{ann.starts || 'Starts'}: <strong>{formatDate(item.startDate)}</strong></span>
                        <span>{'|'}</span>
                        <span>{ann.ends || 'Ends'}: <strong>{formatDate(item.endDate)}</strong></span>
                        {item.type === 'ending' && (() => {
                          const dl = getDaysLeft(item.endDate);
                          return (
                            <span className="ending-warn">
                              {dl <= 0 ? (ann.endsToday || 'Ends today!')
                                : dl === 1 ? (ann.endsTomorrow || 'Ends tomorrow!')
                                  : `${dl} ${ann.daysLeft || 'days left'}`}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="home-announce-cta">
                        <Link to={`/campaign/${item.id}`}>
                          {ann.viewCampaign || 'View campaign'}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </Link>
                      </div>
                    </>
                  )}

                  <div className="home-announce-controls">
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="iconBtn" onClick={() => setAnn(annIdx - 1)} aria-label="Previous">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                      </button>
                      <button className="iconBtn" onClick={() => setAnn(annIdx + 1)} aria-label="Next">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                      </button>
                    </div>
                    <div className="home-announce-dots">
                      {allAnnouncements.map((a, i) => {
                        let dotActive = '';
                        if (i === annIdx) {
                          if (a._sys) {
                            dotActive = a.type === 'maintenance' ? 'active maintenance' : a.type === 'improvement' ? 'active improvement' : 'active feature';
                          } else {
                            dotActive = a.type === 'ending' ? 'active ending' : a.type === 'popular' ? 'active popular' : 'active';
                          }
                        }
                        return (
                          <button
                            key={(a.id || a.sysKey) + '-' + i}
                            className={`home-announce-dot ${dotActive}`}
                            onClick={() => setAnn(i)}
                            aria-label={`Announcement ${i + 1}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="home-announce-progress">
                    <div className={`home-announce-progress-fill ${isSys ? item.type : (item.type === 'ending' ? 'ending' : item.type === 'popular' ? 'popular' : '')}`} ref={progressRef} />
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Video Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              {t.common.loading}
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="home-empty">
              <p>{t.home.noVideos}</p>
              <Link to="/upload" className="btn primary">
                {t.home.uploadBtn}
              </Link>
            </div>
          ) : (
            <div className="home-grid">
              {filteredVideos.map((video) => (
                <Link
                  key={video.id}
                  to={`/watch/${video.id}`}
                  className="home-card"
                >
                  {/* Thumbnail */}
                  <div className="home-card-thumb">
                    {getVideoThumbnail(video) ? (
                      <img
                        src={getVideoThumbnail(video)}
                        alt={video.title || 'Video'}
                        loading="lazy"
                      />
                    ) : (
                      <div className="home-card-video-fallback">
                        <video
                          src={`${getVideoSrc(video)}#t=1`}
                          preload="metadata"
                          muted
                          playsInline
                          crossOrigin="anonymous"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            // Hide video on error
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="home-card-video-icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--muted)" stroke="none">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        </div>
                      </div>
                    )}
                    <div className="home-card-play">
                      <div style={{
                        width: 0,
                        height: 0,
                        borderLeft: '12px solid var(--text)',
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        marginLeft: '2px',
                      }} />
                    </div>
                    {/* Duration badge */}
                    <div className="home-card-duration">
                      {formatCount(video.views || 0)} {t.home.views}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="home-card-body">
                    <p className="home-card-title">{video.title || 'Untitled'}</p>
                    <div className="home-card-meta">
                      <span className="home-card-badge">@{getCreatorName(video)}</span>
                      {video.category && (
                        <span className="home-card-badge">{video.category}</span>
                      )}
                      <div className="home-card-actions">
                        <button
                          className={`home-card-action-btn ${likedVideos[video.id] ? 'liked' : ''}`}
                          onClick={(e) => handleLike(e, video)}
                          title={t.home.like}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={likedVideos[video.id] ? '#FF4D6D' : 'none'} stroke={likedVideos[video.id] ? '#FF4D6D' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          <span>{formatCount(video.Likes?.length || 0)}</span>
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
                          title={t.home.share}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              
              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div 
                  ref={loadMoreRef} 
                  style={{ 
                    gridColumn: '1 / -1', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    padding: '20px' 
                  }}
                >
                  {loadingMore && (
                    <div className="loading-spinner" style={{ width: '32px', height: '32px' }} />
                  )}
                </div>
              )}
              
              {/* End of videos message */}
              {!hasMore && videos.length > 0 && (
                <div 
                  style={{ 
                    gridColumn: '1 / -1', 
                    textAlign: 'center', 
                    padding: '20px', 
                    color: 'var(--muted)',
                    fontSize: '14px'
                  }}
                >
                  {t.home.noMoreVideos || 'No more videos to load'}
                </div>
              )}
            </div>
          )}
        </main>

        <RightPanel
          videos={filteredVideos}
          onPlayVideo={(index) => {
            const video = filteredVideos[index];
            if (video) {
              window.location.href = `/watch/${video.id}`;
            }
          }}
        />
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.open}
        onClose={() => setShareModal({ open: false, url: '', title: '' })}
        url={shareModal.url}
        title={shareModal.title}
      />

      {instructionsOpen && (
        <div className="major_announcement_modal_overlay" onClick={() => setInstructionsOpen(false)}>
          <div className="major_announcement_modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="major-announcement-title">
            <div className="major_announcement_modal_header">
              <h2 id="major-announcement-title">Instructions</h2>
              <button
                type="button"
                className="major_announcement_modal_close"
                onClick={() => setInstructionsOpen(false)}
                aria-label="Close instructions"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="major_announcement_modal_body">
              <h3>大专联首届“华府系列挑战赛”暨“华莱美（Hurammy）大奖赛”年度选拔赛实施细则</h3>

              <h4>一、赛事宗旨</h4>
              <p>音乐跨越语言与国界，歌声连接世界与梦想。为促进华府及全球华人及国际音乐爱好者的文化交流，打造具有国际影响力的数字音乐赛事品牌，特举办首届“华府系列挑战赛”暨“华莱美（Hurammy）大奖赛”年度选拔赛。</p>
              <p>赛事由大专院校校友会联合会（CAAGW）主办，技术支持依托 SceneX AI 平台、人工智能评测技术及全球社交媒体传播体系，通过线上海选、区域晋级赛和年度全球总决赛相结合的方式，发掘优秀歌唱人才，打造全球华人最具影响力的卡拉 OK 赛事品牌。</p>
              <p>以艺术交流促进社区融合，以数字科技赋能文化传播。通过线上线下结合的创新模式，发掘和培养优秀艺术人才，打造具有华府地区影响力并辐射全美及全球的文化品牌赛事。</p>

              <h4>二、参赛资格</h4>
              <p><strong>报名对象：</strong>面向华府、美国及海外华人、华裔及热爱中华文化人士开放；国籍、职业不限；参赛者须遵守赛事规则并同意作品授权协议。</p>
              <p><strong>年龄分组：</strong>青少年组：18 周岁以下（含 18 周岁）；成人组：18 周岁 - 59 周岁；乐龄组：60 周岁以上。</p>
              <p><strong>专业分组：</strong>专业组包括艺术院校在校生及毕业生、专业演艺从业人员、具有专业艺术训练背景者；业余组包括非职业艺术从业者及社区艺术爱好者。组委会有权根据实际情况调整选手组别。</p>
              <p><strong>演唱类别：</strong>美声歌曲（包括中国艺术歌曲及古诗词艺术歌曲）、流行及通俗歌曲、音乐剧选段等。</p>

              <h4>三、比赛项目</h4>
              <p><strong>“唱响��府��卡拉 OK 挑战赛：</strong>演唱语言不限，曲目内容健康向上。允许独唱、对唱及组合形式，并可定期开放现场 PK 形式。月赛视频时长控制在 1 分钟以内，季赛及年度赛视频时长控制在 3 分钟以内。专业评委老师 3 - 5 位。</p>
              <p><strong>“影动视界”短剧创意大奖赛：</strong>参赛类别包括原创短剧、动漫短剧、真人短剧。作品时长 1 - 5 分钟，内容积极健康，鼓励原创作品。专业评委老师 3 - 5 位。</p>

              <h4>四、赛事流程</h4>
              <p><strong>第一阶段：月赛视频上传。</strong>宣传开始后每个月进行。选手登录 Hurammy.com 注册报名，上传符合要求的参赛视频及相关资料，开启全网互动投票、打榜、排名、热门视频循环播放等，专业评委发布评语，AI 智能评分同步启动。</p>
              <p><strong>晋级规则：</strong>综合成绩 = 专业评分 × 70% + 网络人气评分 × 30%。各组别前 20 名晋级季度赛，月赛前三有奖品。</p>
              <p><strong>第二阶段：季度晋级赛。</strong>每季度举办一次，内容包括专业导师辅导培训、录音棚及摄影棚专业制作、重新发布作品参与人气竞赛、专家评委集中评审。各组别前 5 名进入年度总决赛。</p>
              <p><strong>第三阶段：年度总决赛。</strong>时间为 2027 年年初或春季，形式包括现场演出、网络直播、嘉宾表演、颁奖典礼。</p>

              <h4>五、奖项设置</h4>
              <p><strong>综合大奖：</strong>专业组冠军、亚军、季军；业余组冠军、亚军、季军。</p>
              <p><strong>唱响华府单项荣誉奖：</strong>最受欢迎歌手奖、最佳视频制作奖、最佳台风奖、最佳人气奖、最具潜力新人奖。</p>
              <p><strong>影动视界单项荣誉奖：</strong>最佳原创剧本奖、最佳导演奖、最佳创意奖、最佳制作奖、最佳演员奖。</p>
              <p><strong>特别奖：</strong>华莱美年度艺术家奖、华莱美杰出贡献奖、最佳组织奖、优秀义工团队奖、最佳合作伙伴奖。</p>

              <h4>六、奖金及奖品建议</h4>
              <p>具体奖金根据赞助情况调整。</p>

              <h4>七、知识产权与授权</h4>
              <ul>
                <li>参赛者保证拥有作品合法版权。</li>
                <li>作品不得侵犯第三方知识产权。</li>
                <li>参赛作品授权组委会用于赛事宣传、展播及推广。</li>
                <li>作者保留作品署名权。</li>
              </ul>

              <h4>八、���规处理</h4>
              <p>出现以下情况之一，组委会有权取消参赛资格：抄袭、剽窃作品；虚假报名资料；刷票、恶意操纵数据；发布违法或不当内容；影响赛事公平公正的行为。</p>

              <h4>九、赛事宣传主题建议</h4>
              <ul>
                <li>华府之声，世界共鸣；科技赋能，梦想启航。</li>
                <li>唱响华府，影动世界；汇聚英才，共创华莱美。</li>
                <li>Hurammy Awards——让每一份才华都被世界看见。</li>
                <li>One Voice • One World</li>
              </ul>
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

export default Home;
