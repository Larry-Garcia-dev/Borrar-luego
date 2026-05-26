import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { translations } from '../utils/translations';
import { API_URL } from '../config';
import { getAvatarUrl } from '../utils/mediaUtils';

function Header({ onSearch, onToggleSidebar, videos = [], initialQuery = '' }) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSearchVisible, setMobileSearchVisible] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const user = JSON.parse(localStorage.getItem('user'));
  const storedLang = localStorage.getItem('appLanguage') || (user?.language) || 'en';

  const [currentLang, setCurrentLang] = useState(storedLang);
  const navigate = useNavigate();
  const location = useLocation();
  const langRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const lastScrollY = useRef(0);

  const t = translations[currentLang] || translations.en;
  const navItems = [
    { to: '/', label: t.sidebar?.home || 'Home' },
    { to: '/trending', label: t.sidebar?.trending || 'Trending' },
    { to: '/campaigns', label: t.sidebar?.campaigns || 'Campaigns' },
    { to: '/upload', label: t.sidebar?.upload || 'Upload' },
  ];

  // Generate search suggestions based on videos and query
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    
    const q = searchQuery.toLowerCase();
    const seen = new Set();
    const results = [];
    
    // Search through videos for matching titles, descriptions, tags, and creators
    videos.forEach(video => {
      // Match by title
      if (video.title?.toLowerCase().includes(q)) {
        const key = `title:${video.title}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            type: 'video',
            text: video.title,
            videoId: video.id,
            thumbnail: video.thumbnailUrl,
            creator: video.User?.email?.split('@')[0] || 'creator'
          });
        }
      }
      
      // Match by tags
      if (Array.isArray(video.tags)) {
        video.tags.forEach(tag => {
          if (tag.toLowerCase().includes(q)) {
            const key = `tag:${tag.toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              results.push({
                type: 'tag',
                text: tag,
                count: videos.filter(v => v.tags?.some(t => t.toLowerCase() === tag.toLowerCase())).length
              });
            }
          }
        });
      }
      
      // Match by category
      if (video.category?.toLowerCase().includes(q)) {
        const key = `category:${video.category}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            type: 'category',
            text: video.category,
            count: videos.filter(v => v.category === video.category).length
          });
        }
      }
      
      // Match by creator
      const creator = video.User?.email?.split('@')[0];
      if (creator?.toLowerCase().includes(q)) {
        const key = `creator:${creator}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            type: 'creator',
            text: creator,
            count: videos.filter(v => v.User?.email?.split('@')[0] === creator).length
          });
        }
      }
    });
    
    // Sort: videos first, then by relevance (starts with query first)
    results.sort((a, b) => {
      // Videos first
      if (a.type === 'video' && b.type !== 'video') return -1;
      if (b.type === 'video' && a.type !== 'video') return 1;
      
      // Then by starts with query
      const aStarts = a.text.toLowerCase().startsWith(q);
      const bStarts = b.text.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      
      return a.text.localeCompare(b.text);
    });
    
    return results.slice(0, 8); // Limit to 8 suggestions
  }, [searchQuery, videos]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target) &&
          mobileSearchRef.current && !mobileSearchRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic scroll show/hide for mobile search bar
  // Listens on both window and any <main> element (which may have its own overflow scroll)
  useEffect(() => {
    const handleScroll = (e) => {
      const target = e.target;
      let currentY = 0;

      if (target === document || target === window) {
        currentY = window.scrollY;
      } else if (target.scrollTop !== undefined) {
        currentY = target.scrollTop;
      }

      if (currentY > lastScrollY.current && currentY > 60) {
        setMobileSearchVisible(false);
      } else {
        setMobileSearchVisible(true);
      }
      lastScrollY.current = currentY;
    };

    // Listen on window scroll
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Also listen on <main> elements which have their own scroll
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('appLanguage', currentLang);
  }, [currentLang]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.length > 0);
    setSelectedIndex(-1);
    // Don't trigger navigation on typing, just update suggestions
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // Pass true as second param to indicate this is a form submit
    if (onSearch) onSearch(searchQuery, true);
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'video') {
      // Navigate directly to video
      navigate(`/watch/${suggestion.videoId}`);
    } else {
      // Set search query and navigate to home with filter
      setSearchQuery(suggestion.text);
      navigate(`/?search=${encodeURIComponent(suggestion.text)}`);
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleSearchFocus = () => {
    if (searchQuery.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleLanguageSelect = async (newLang) => {
    setLangOpen(false);
    if (newLang === currentLang) return;
    setCurrentLang(newLang);
    localStorage.setItem('appLanguage', newLang);
    if (user) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`${API_URL}/users/language`, {
          userId: user.id,
          language: newLang
        }, { headers: { Authorization: `Bearer ${token}` } });
        user.language = newLang;
        localStorage.setItem('user', JSON.stringify(user));
      } catch (err) { /* ignore */ }
    }
    window.location.reload();
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* SVG icons as small components */
  const IconGlobe = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
  const IconPlus = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
  const IconUser = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
  const IconProfile = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
  const IconVideo = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  );
  const IconTrending = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  );
  const IconFollowing = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
  const IconFavorite = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
  const IconAdmin = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
  const IconLogout = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
  const IconCheck = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand2)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  const IconCoin = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v12"/>
      <path d="M15 9.5c0-1.5-1.5-2.5-3-2.5s-3 1-3 2.5 1.5 2 3 2.5 3 1 3 2.5-1.5 2.5-3 2.5-3-1-3-2.5"/>
    </svg>
  );

  const username = user?.email?.split('@')[0] || '';

  return (
    <>
    <header className="header-shell">
      <div className="header-inner">
        <Link to="/" className="header-brand">
          <img src="/logo.png" alt="Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }}/>
        </Link>

        <nav className="header-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`header-nav-link${location.pathname === item.to ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop search - hidden on mobile via CSS */}
        <div className="header-search-wrapper header-search-desktop" ref={searchRef}>
          <span className="header-search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text" className="header-search-input"
            placeholder={t.header.searchPlaceholder}
            value={searchQuery} 
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          
          {/* Search Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.text}-${index}`}
                  className={`search-suggestion-item${selectedIndex === index ? ' selected' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {suggestion.type === 'video' ? (
                    <>
                      <svg className="suggestion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      <div className="suggestion-content">
                        <span className="suggestion-text">{suggestion.text}</span>
                        <span className="suggestion-meta">Video by {suggestion.creator}</span>
                      </div>
                    </>
                  ) : suggestion.type === 'tag' ? (
                    <>
                      <svg className="suggestion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                        <line x1="7" y1="7" x2="7.01" y2="7"/>
                      </svg>
                      <div className="suggestion-content">
                        <span className="suggestion-text">#{suggestion.text}</span>
                        <span className="suggestion-meta">{suggestion.count} videos</span>
                      </div>
                    </>
                  ) : suggestion.type === 'category' ? (
                    <>
                      <svg className="suggestion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                      </svg>
                      <div className="suggestion-content">
                        <span className="suggestion-text">{suggestion.text}</span>
                        <span className="suggestion-meta">{suggestion.count} videos in category</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg className="suggestion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                      <div className="suggestion-content">
                        <span className="suggestion-text">@{suggestion.text}</span>
                        <span className="suggestion-meta">{suggestion.count} videos</span>
                      </div>
                    </>
                  )}
                  <svg className="suggestion-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="header-actions">
          {/* Language */}
          <div className="header-lang-wrapper" ref={langRef}>
            <button className="iconBtn header-lang-btn" onClick={() => setLangOpen(p => !p)} aria-label="Change language" title="Change language">
              {IconGlobe}
            </button>
            {langOpen && (
              <div className="header-lang-dropdown">
                {[
                  { code: 'en', label: 'English', flag: 'EN' },
                  { code: 'es', label: 'Espanol', flag: 'ES' },
                  { code: 'zh', label: '\u4E2D\u6587', flag: 'ZH' },
                ].map((lang) => (
                  <button key={lang.code} className={`header-lang-option${currentLang === lang.code ? ' active' : ''}`} onClick={() => handleLanguageSelect(lang.code)}>
                    <span className="header-lang-flag">{lang.flag}</span>
                    <span className="header-lang-label">{lang.label}</span>
                    {currentLang === lang.code && IconCheck}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <>
              {/* Upload */}
              <Link to="/upload" className="iconBtn" title={t.header.upload}
                style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {IconPlus}
              </Link>

              {/* User avatar + dropdown */}
              <div className="header-user-wrapper" ref={userMenuRef}>
                <button
                  className="header-user-avatar"
                  onClick={() => setUserMenuOpen(p => !p)}
                  title={user.email}
                  aria-label="User menu"
                >
                  {user.avatar ? (
                    <img src={getAvatarUrl(user.avatar)} alt="" className="header-user-avatar-img"/>
                  ) : IconUser}
                </button>

                {userMenuOpen && (
                  <div className="header-user-dropdown">
                    {/* User info header */}
                    <div className="header-user-dd-info">
                      <div className="header-user-dd-avatar">
                        {user.avatar ? (
                          <img src={getAvatarUrl(user.avatar)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}/>
                        ) : IconUser}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="header-user-dd-name">@{username}</div>
                        <div className="header-user-dd-email">{user.email}</div>
                      </div>
                    </div>

                    <div className="header-user-dd-sep"/>

                    {/* My Profile */}
                    <button className="header-user-dd-item" onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}>
                      {IconProfile}
                      <span>{t.header.myProfile || 'My Profile'}</span>
                    </button>

                    {/* My Videos */}
                    <button className="header-user-dd-item" onClick={() => { setUserMenuOpen(false); navigate('/my-videos'); }}>
                      {IconVideo}
                      <span>{t.header.myVideos || 'My Videos'}</span>
                    </button>

                    <button className="header-user-dd-item" onClick={() => { setUserMenuOpen(false); navigate('/following'); }}>
                      {IconFollowing}
                      <span>{t.sidebar?.following || 'Following'}</span>
                    </button>

                    <button className="header-user-dd-item" onClick={() => { setUserMenuOpen(false); navigate('/favorites'); }}>
                      {IconFavorite}
                      <span>{t.sidebar?.favorites || 'Favorites'}</span>
                    </button>

                    {user.role === 'admin' && (
                      <button className="header-user-dd-item" onClick={() => { setUserMenuOpen(false); navigate('/admin'); }}>
                        {IconAdmin}
                        <span>{t.header.adminPanel || t.adminPanel?.title || 'Admin Panel'}</span>
                      </button>
                    )}

                    <div className="header-user-dd-sep"/>

                    {/* WAi Coins Balance */}
                    <div className="header-user-dd-coins">
                      {IconCoin}
                      <span style={{ flex: 1 }}>{t.header?.waiCoins || 'WAi Coins'}</span>
                      <span style={{ 
                        fontWeight: 600, 
                        color: user.coinsFrozen ? 'var(--error)' : 'var(--brand2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {user.waiCoins ?? 0}
                        {user.coinsFrozen && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" title="Account frozen">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        )}
                      </span>
                    </div>

                    <div className="header-user-dd-sep"/>

                    {/* Logout */}
                    <button className="header-user-dd-item logout" onClick={handleLogout}>
                      {IconLogout}
                      <span>{t.header.logout}</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="btn primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              {t.header.login}
            </Link>
          )}
        </div>
      </div>
    </header>

    {/* Mobile search bar - visible only on mobile, hides on scroll down, shows on scroll up */}
    <div className={`header-mobile-search${mobileSearchVisible ? '' : ' hidden'}`} ref={mobileSearchRef}>
      <form className="header-mobile-search-form" onSubmit={handleSearchSubmit}>
        <span className="header-search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          type="text"
          className="header-search-input"
          placeholder={t.header.searchPlaceholder}
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={handleSearchFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button type="submit" className="header-mobile-search-btn">
          {t.header.searchBtn || 'Search'}
        </button>
      </form>
      
      {/* Mobile Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions mobile">
          {suggestions.map((suggestion, index) => (
            <button
              key={`mobile-${suggestion.type}-${suggestion.text}-${index}`}
              className={`search-suggestion-item${selectedIndex === index ? ' selected' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion.type === 'video' ? (
                <>
                  <svg className="suggestion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  <div className="suggestion-content">
                    <span className="suggestion-text">{suggestion.text}</span>
                    <span className="suggestion-meta">Video</span>
                  </div>
                </>
              ) : suggestion.type === 'tag' ? (
                <>
                  <svg className="suggestion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                  <div className="suggestion-content">
                    <span className="suggestion-text">#{suggestion.text}</span>
                    <span className="suggestion-meta">{suggestion.count} videos</span>
                  </div>
                </>
              ) : suggestion.type === 'category' ? (
                <>
                  <svg className="suggestion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <div className="suggestion-content">
                    <span className="suggestion-text">{suggestion.text}</span>
                    <span className="suggestion-meta">Category</span>
                  </div>
                </>
              ) : (
                <>
                  <svg className="suggestion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <div className="suggestion-content">
                    <span className="suggestion-text">@{suggestion.text}</span>
                    <span className="suggestion-meta">{suggestion.count} videos</span>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

export default Header;
