import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import { translations } from '../utils/translations';
import { API_URL } from '../config';
function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const user = JSON.parse(localStorage.getItem('user'));
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const c = t.campaigns || {};

  useEffect(() => {
    // Ya no necesitas el if/else aquí, la variable API_URL lo hace todo
    axios.get(`${API_URL}/campaigns`)
      .then(res => setCampaigns(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr) => {
    const locale = lang === 'es' ? 'es-ES' : lang === 'zh' ? 'zh-CN' : 'en-US';
    return new Date(dateStr).toLocaleDateString(locale, { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />
      
      <main className="wrap" style={{ maxWidth: '1180px', margin: '0 auto', padding: '18px' }}>
        {/* Header with Admin Button */}
        <section style={{
          position: 'relative',
          padding: '24px',
          borderRadius: 'var(--r22)',
          border: '1px solid rgba(234, 240, 255, 0.14)',
          background: `
            radial-gradient(700px 400px at 20% 20%, rgba(25, 211, 255, 0.18), transparent 60%),
            radial-gradient(780px 420px at 80% 30%, rgba(124, 92, 255, 0.22), transparent 65%),
            var(--panel)
          `,
          boxShadow: 'var(--shadow)',
          marginBottom: '24px',
        }}>
          <div className="campaign-list-header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
                <span className="pill">{c.activeChallenges || 'Active Challenges'}</span>
                <h1 style={{ 
                    margin: '12px 0 8px', 
                    fontSize: 'clamp(20px, 2.4vw, 32px)',
                    letterSpacing: '-0.3px',
                }}>
                    {c.title || 'Video Challenges & Campaigns'}
                </h1>
                <p style={{ margin: 0, color: 'var(--muted)', maxWidth: '80ch', lineHeight: 1.6 }}>
                    {c.subtitle || 'Participate in challenges to rank your videos on the leaderboard.'}
                </p>
            </div>

            {user && user.role === 'admin' && (
                <Link 
                    to="/create-campaign" 
                    className="btn primary"
                    style={{ 
                        background: 'white', 
                        color: 'black', 
                        fontWeight: 800,
                        boxShadow: '0 4px 15px rgba(255,255,255,0.2)' 
                    }}
                >
                    {c.newCampaign || '+ New Campaign'}
                </Link>
            )}
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginTop: '20px',
            maxWidth: '500px',
          }}>
            <div className="kpi">
              <b>{campaigns.length}</b>
              <span>{c.activeCampaigns || 'Active Campaigns'}</span>
            </div>
            <div className="kpi">
              <b>{c.realtime || 'Real-time'}</b>
              <span>{c.realtimeRanking || 'Ranking Updates'}</span>
            </div>
          </div>
        </section>

        {/* Campaign Grid */}
        <section>
          {loading ? (
            <div className="panel" style={{ padding: '40px', textAlign: 'center' }}>
              <span className="muted">{c.loadingCampaigns || 'Loading campaigns...'}</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="panel" style={{ padding: '40px', textAlign: 'center' }}>
              <span className="muted">{c.noCampaigns || 'No active campaigns at the moment.'}</span>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {campaigns.map(camp => (
                <article key={camp.id} className="panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span className="pill">{c.challenge || 'Challenge'}</span>
                    <span className="pill" style={{ 
                      background: 'rgba(70, 230, 165, 0.1)', 
                      borderColor: 'rgba(70, 230, 165, 0.2)',
                      color: 'var(--good)',
                    }}>
                      <span className="dot"></span>
                      {c.active || 'Active'}
                    </span>
                  </div>
                  
                  <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800 }}>
                    {camp.name}
                  </h3>
                  
                  <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: '13px', lineHeight: 1.5 }}>
                    {camp.description}
                  </p>
                  
                  <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{c.endsOn || 'Ends on'}</div>
                    <div style={{ fontWeight: 700 }}>{formatDate(camp.endDate)}</div>
                  </div>
                  
                  <Link to={`/campaign/${camp.id}`} className="btn primary" style={{ width: '100%' }}>
                    {c.viewLeaderboard || 'View Leaderboard'}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CampaignList;
