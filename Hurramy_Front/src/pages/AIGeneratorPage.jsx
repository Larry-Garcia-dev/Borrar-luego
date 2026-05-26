import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AIVideoGenerator from '../components/AIVideoGenerator';
import { translations } from '../utils/translations';
import './AIGeneratorPage.css';

const AIGeneratorPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const ai = t.aiGenerator || {};

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main style={{ padding: '18px', overflowY: 'auto' }}>
          {/* Hero Section */}
          <div className="ai-page-hero">
            <div className="ai-page-hero-badge">
              <span className="ai-page-hero-dot"></span>
              {ai.poweredByAI || 'Powered by AI'}
            </div>
            <h1 className="ai-page-hero-title">{ai.pageTitle || 'Create videos with Artificial Intelligence'}</h1>
            <p className="ai-page-hero-subtitle">
              {ai.pageSubtitle || 'Transform your images into stunning videos with a single click. Our AI generates high-quality content in minutes.'}
            </p>
          </div>

          {/* Generator Component */}
          <div className="ai-page-generator">
            <AIVideoGenerator translations={ai} />
          </div>

          {/* Features Grid */}
          <div className="ai-page-features">
            <div className="ai-feature-card">
              <div className="ai-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3>{ai.featureFast || 'Fast'}</h3>
              <p>{ai.featureFastDesc || 'Videos generated in 1-5 minutes'}</p>
            </div>
            <div className="ai-feature-card">
              <div className="ai-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <h3>{ai.featureQuality || 'High Quality'}</h3>
              <p>{ai.featureQualityDesc || 'Professional 720p resolution'}</p>
            </div>
            <div className="ai-feature-card">
              <div className="ai-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <h3>{ai.featureAudio || 'With Audio'}</h3>
              <p>{ai.featureAudioDesc || 'Add your own music'}</p>
            </div>
            <div className="ai-feature-card">
              <div className="ai-feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <h3>{ai.featureDownload || 'Downloadable'}</h3>
              <p>{ai.featureDownloadDesc || 'Save your videos easily'}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AIGeneratorPage;
