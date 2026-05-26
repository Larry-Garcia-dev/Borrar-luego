import React, { useState, useMemo } from 'react';
import { getVideoUrl, getThumbnailUrl } from '../utils/mediaUtils';

/**
 * JoinVideoSidebar
 * Props:
 *   myVideos: array of video objects owned by the user (already normalized URLs)
 *   selectedVideoId: currently selected video id
 *   setSelectedVideoId: function to update selected video
 *   handleJoin: function to invoke join API
 *   titleText: UI text (translated) for the section title
 *   buttonText: UI text (translated) for the join button
 *   placeholderText: UI text (translated) for search placeholder
 */
const JoinVideoSidebar = ({ myVideos = [], selectedVideoId, setSelectedVideoId, handleJoin, titleText, buttonText, placeholderText }) => {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return myVideos;
    const q = search.toLowerCase();
    return myVideos.filter(v =>
      v.title?.toLowerCase().includes(q) ||
      v.id?.toString().includes(q)
    );
  }, [search, myVideos]);

  const renderVideoThumb = (video) => {
    const thumbnail = getThumbnailUrl(video?.thumbnailUrl);
    const style = { width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '4px' };

    return thumbnail ? (
      <img src={thumbnail} alt={video?.title || 'Video'} style={style} loading="lazy" />
    ) : (
      <video
        src={`${getVideoUrl(video?.videoUrl)}#t=1`}
        preload="metadata"
        muted
        playsInline
        crossOrigin="anonymous"
        style={style}
      />
    );
  };

  return (
    <div style={{
      width: '100%',
      padding: '12px',
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      alignItems: 'stretch',
    }}>
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="btn"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <span>{titleText || 'Select video to join campaign'}</span>
        <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <>
          <input
            type="text"
            placeholder={placeholderText || 'Buscar video...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '8px',
              border: '1px solid var(--line)',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', width: '100%' }}>
            {filtered.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedVideoId(v.id)}
                style={{
                  border: selectedVideoId === v.id ? '2px solid var(--good)' : '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {renderVideoThumb(v)}
                <div style={{ fontSize: '12px', textAlign: 'center' }}>{v.title}</div>
              </div>
            ))}
          </div>
          <button onClick={handleJoin} className="btn primary" style={{ width: '100%' }}>
            {buttonText || 'Join Compaign'}
          </button>
        </>
      )}
    </div>
  );
};

export default JoinVideoSidebar;
