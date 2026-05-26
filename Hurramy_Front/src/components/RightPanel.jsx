import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { translations } from '../utils/translations';
import { API_URL } from '../config';
import { getThumbnailUrl } from '../utils/mediaUtils';

const API = API_URL;

function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function RightPanel({ videos = [], currentVideoIndex = 0 }) {
  const [topCreators, setTopCreators] = useState([]);
  const [topVideos, setTopVideos] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(true);

  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // Fetch top creators
  const fetchCreators = useCallback(() => {
    const params = user ? `?userId=${user.id}` : '';
    axios.get(`${API}/users/top-creators${params}`)
      .then(res => setTopCreators(res.data))
      .catch(() => setTopCreators([]))
      .finally(() => setLoadingCreators(false));
  }, [user?.id]);

  // Fetch top 10 videos from dedicated endpoint
  useEffect(() => {
    axios.get(`${API}/videos/top`)
      .then(res => setTopVideos(res.data || []))
      .catch(() => {
        // Fallback: fetch all and sort client-side
        axios.get(`${API}/videos`)
          .then(r => {
            const sorted = [...r.data].sort((a, b) => {
              const aScore = (a.views || 0) + (a.Likes?.length || 0) * 3;
              const bScore = (b.views || 0) + (b.Likes?.length || 0) * 3;
              return bScore - aScore;
            }).slice(0, 10);
            setTopVideos(sorted);
          })
          .catch(() => setTopVideos([]));
      })
      .finally(() => setLoadingVideos(false));

    // Fetch trending hashtags from dedicated endpoint
    axios.get(`${API}/videos/trending-hashtags`)
      .then(res => setTrendingHashtags(res.data || []))
      .catch(() => {
        // Fallback: extract client-side from all videos
        axios.get(`${API}/videos`)
          .then(r => {
            const hashtagMap = {};
            r.data.forEach(video => {
              const desc = video.description || '';
              const matches = desc.match(/#[\w]+/g) || [];
              matches.forEach(tag => {
                const lower = tag.toLowerCase();
                if (!hashtagMap[lower]) hashtagMap[lower] = { tag: lower, count: 0, weight: 0 };
                hashtagMap[lower].count += 1;
                hashtagMap[lower].weight += (video.views || 0);
              });
              const tagList = Array.isArray(video.tags) ? video.tags : (video.tags || '').split(',').map(t => t.trim()).filter(Boolean);
              tagList.forEach(tagStr => {
                const ht = `#${tagStr.toLowerCase().replace(/^#/, '')}`;
                if (!hashtagMap[ht]) hashtagMap[ht] = { tag: ht, count: 0, weight: 0 };
                hashtagMap[ht].count += 1;
                hashtagMap[ht].weight += (video.views || 0);
              });
            });
            const sorted = Object.values(hashtagMap).sort((a, b) => b.weight - a.weight).slice(0, 10);
            setTrendingHashtags(sorted);
          })
          .catch(() => setTrendingHashtags([]));
      });
  }, []);

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  // Toggle follow
  const handleToggleFollow = async (creatorId) => {
    if (!user) {
      alert(t.home?.signInToFollow || 'Sign in to follow creators');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/users/toggle-follow`, {
        followerId: user.id,
        followingId: creatorId
      }, { headers: { Authorization: `Bearer ${token}` } });

      setTopCreators(prev => prev.map(c => {
        if (c.id === creatorId) {
          return {
            ...c,
            isFollowing: res.data.isFollowing,
            followers: res.data.followers
          };
        }
        return c;
      }));
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  return (
    <aside className="right-panel" role="complementary">
      {/* 1. Up Next - Top 10 most viewed */}
      <div className="panel rp-section">
        <div className="rp-section-header">
          <span className="rp-section-title">{t.rightPanel?.upNext || 'Up Next'}</span>
          <span className="rp-section-badge">{t.rightPanel?.top10 || 'Top 10'}</span>
        </div>
        {loadingVideos ? (
          <div className="rp-loading">{t.common?.loading || 'Loading...'}</div>
        ) : topVideos.length === 0 ? (
          <div className="rp-empty">{t.rightPanel?.noQueue || 'No videos in queue'}</div>
        ) : (
          <div className="rp-queue-list">
            {topVideos.map((video, index) => (
              <Link key={video.id} to={`/watch/${video.id}`} className="rp-queue-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="rp-queue-rank">{index + 1}</div>
                <div className="rp-queue-thumb">
                  {video.thumbnailUrl ? (
                    <img src={getThumbnailUrl(video.thumbnailUrl)} alt="" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  )}
                </div>
                <div className="rp-queue-info">
                  <div className="rp-queue-title">
                    {video.title?.slice(0, 30) || `Video ${index + 1}`}
                  </div>
                  <div className="rp-queue-views">
                    {formatCount(video.views || 0)} {t.home?.views || 'views'}
                    <span className="rp-stat-dot" />
                    {formatCount(video.likeCount ?? video.Likes?.length ?? 0)} {t.rightPanel?.likesLabel || 'likes'}
                  </div>
                </div>
                <div className="rp-play-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 2. Trending Hashtags - real data from descriptions */}
      <div className="panel rp-section">
        <div className="rp-section-header">
          <span className="rp-section-title">{t.rightPanel?.trendingHashtags || 'Trending Hashtags'}</span>
        </div>
        {loadingVideos ? (
          <div className="rp-loading">{t.common?.loading || 'Loading...'}</div>
        ) : trendingHashtags.length === 0 ? (
          <div className="rp-empty">{t.rightPanel?.noHashtags || 'No hashtags yet'}</div>
        ) : (
          trendingHashtags.map((item, i) => (
            <div key={i} className="rp-hashtag-item">
              <span className="rp-hashtag-tag">{item.tag}</span>
              <span className="rp-hashtag-count">
                {formatCount(item.count)} {t.rightPanel?.posts || 'posts'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 3. Trending Creators */}
      <div className="panel rp-section">
        <div className="rp-section-header">
          <span className="rp-section-title">{t.rightPanel?.trendingCreators || 'Trending Creators'}</span>
        </div>

        {loadingCreators ? (
          <div className="rp-loading">{t.common?.loading || 'Loading...'}</div>
        ) : topCreators.length === 0 ? (
          <div className="rp-empty">{t.rightPanel?.noCreators || 'No creators yet'}</div>
        ) : (
          <div className="rp-creator-list">
            {topCreators.map((creator, i) => (
              <div key={creator.id} className="rp-creator-item">
                <div className="rp-creator-rank">{i + 1}</div>
                <div className="rp-creator-avatar">
                  {creator.username?.charAt(1)?.toUpperCase() || '?'}
                </div>
                <div className="rp-creator-info">
                  <div className="rp-creator-name" title={creator.username}>{creator.username}</div>
                  <div className="rp-creator-stats">
                    <span>{formatCount(creator.followers)} {t.rightPanel?.followersLabel || 'followers'}</span>
                    <span className="rp-stat-dot" />
                    <span>{formatCount(creator.totalViews)} {t.home?.views || 'views'}</span>
                  </div>
                </div>
                <button
                  className={`rp-follow-btn ${creator.isFollowing ? 'following' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleToggleFollow(creator.id); }}
                >
                  {creator.isFollowing
                    ? (t.home?.following_btn || 'Following')
                    : (t.home?.follow || 'Follow')
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel rp-section rp-ecosystem-block">
        <img className="rp-ecosystem-logo" src="/scenexai_logo.png" alt="SceneX AI Group" />
        <p className="rp-ecosystem-copy">
          HURAMMY is part of the SceneX AI Immersive & Interactive Entertainment Ecosystem.{' '}
          <a href="https://scene-x.ai" target="_blank" rel="noreferrer">
            Learn more -&gt;
          </a>
        </p>
      </div>

      {/* Footer */}
      <div className="rp-footer">
        &copy; 2026  HURRAMY.COM
        <br/>
        <span style={{ opacity: 0.7 }}>Terms & Privacy</span>
      </div>
    </aside>
  );
}

export default RightPanel;
