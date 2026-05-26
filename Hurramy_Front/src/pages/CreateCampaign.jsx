import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { translations } from '../utils/translations';
import { getMediaUrl } from '../utils/mediaUtils';

function CreateCampaign() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editCampaignId = searchParams.get('edit');
  const isEditMode = Boolean(editCampaignId);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    bannerUrl: ''
  });

  // Team members state
  const [teamMembers, setTeamMembers] = useState([]);
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCampaign, setLoadingCampaign] = useState(false);

  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const ct = t.createCampaign || {};

  // Verify admin access
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [navigate]);

  // Load campaign data if editing
  useEffect(() => {
    if (isEditMode && editCampaignId) {
      loadCampaignData();
    }
  }, [editCampaignId, isEditMode]);

  const loadCampaignData = async () => {
    setLoadingCampaign(true);
    try {
      const res = await axios.get(`${API_URL}/campaigns/${editCampaignId}`);
      const campaign = res.data;
      
      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        startDate: campaign.startDate || '',
        endDate: campaign.endDate || '',
        bannerUrl: campaign.bannerUrl || ''
      });

      // Load team members if they exist
      if (campaign.teamMembers && campaign.teamMembers.length > 0) {
        setTeamMembers(campaign.teamMembers.map(m => ({
          id: m.id,
          name: m.name || '',
          role: m.role || 'Organizer',
          pictureUrl: m.pictureUrl || '',
          bio: m.bio || ''
        })));
      }
    } catch (err) {
      setError(ct.loadError || 'Error loading campaign data');
      console.error('Error loading campaign:', err);
    } finally {
      setLoadingCampaign(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Team member handlers
  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { name: '', role: 'Organizer', pictureUrl: '', bio: '' }]);
  };

  const removeTeamMember = (index) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index, field, value) => {
    const updated = [...teamMembers];
    updated[index][field] = value;
    setTeamMembers(updated);
  };

  // Helper function to get proper image URL - uses centralized mediaUtils
  const getImageUrl = (url) => {
    if (!url) return null;
    return getMediaUrl(url);
  };

  // Banner upload handler
  const handleBannerUpload = async (file) => {
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('campaign_banner', file);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/campaigns/upload-banner`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data.url) {
        setFormData(prev => ({ ...prev, bannerUrl: res.data.url }));
      }
    } catch (err) {
      console.error('Error uploading banner:', err);
      setError(ct.uploadError || 'Error uploading banner');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleTeamMemberPictureUpload = async (index, file) => {
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('team_picture', file);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/campaigns/upload-team-picture`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data.url) {
        updateTeamMember(index, 'pictureUrl', res.data.url);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(ct.uploadError || 'Error uploading image');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    // Validate team members
    const validTeamMembers = teamMembers.filter(m => m.name.trim() !== '');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        teamMembers: validTeamMembers
      };

      if (isEditMode) {
        // Update existing campaign
        await axios.put(`${API_URL}/campaigns/${editCampaignId}`, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        setMessage(ct.updateSuccessMsg || 'Campaign updated successfully!');
      } else {
        // Create new campaign
        await axios.post(`${API_URL}/campaigns/create`, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        setMessage(ct.successMsg || 'Campaign created successfully!');
        setFormData({ name: '', description: '', startDate: '', endDate: '', bannerUrl: '' });
        setTeamMembers([]);
      }
      
      setTimeout(() => navigate('/admin'), 2000);

    } catch (err) {
      setError(err.response?.data?.message || ct.errorMsg || 'Error saving campaign.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingCampaign) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header onSearch={() => {}} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <span className="muted">{ct.loadingCampaign || 'Loading campaign...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onSearch={() => {}} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      
      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main style={{ padding: '24px', width: '100%', overflowY: 'auto' }}>
          <div className="panel" style={{ maxWidth: '700px', margin: '0 auto', padding: '30px' }}>
            <h1 style={{ fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
              {isEditMode 
                ? (ct.editTitle || 'Edit Campaign')
                : (ct.title || 'Launch New Campaign')
              }
            </h1>
            
            <p className="muted" style={{ marginBottom: '24px', fontSize: '14px' }}>
              {ct.subtitle || 'Create an event or challenge for the community to participate in by uploading their best videos.'}
            </p>

            {message && <div style={{ background: 'rgba(70,230,165,0.1)', color: 'var(--good)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px' }}>{message}</div>}
            {error && <div style={{ background: 'rgba(255,77,109,0.1)', color: 'var(--bad)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Campaign Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                  {ct.nameLabel || 'Campaign Name'}
                </label>
                <input 
                  type="text" 
                  name="name"
                  className="input" 
                  placeholder={ct.namePlaceholder || 'Ex: Summer Dance Challenge 2026'}
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                  {ct.descLabel || 'Description and Rules'}
                </label>
                <textarea 
                  name="description"
                  className="input" 
                  placeholder={ct.descPlaceholder || 'Explain what the campaign is about, what users should upload, etc.'}
                  value={formData.description}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
                />
              </div>

              {/* Campaign Banner */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                  {ct.bannerLabel || 'Campaign Banner (size: 10 x 1)'}
                </label>
                <div style={{ 
                  border: '1px dashed var(--line)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  background: 'rgba(0,0,0,0.2)'
                }}>
                  {formData.bannerUrl ? (
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={getImageUrl(formData.bannerUrl)} 
                        alt="Campaign Banner"
                        style={{ 
                          width: '100%', 
                          height: 'auto',
                          maxHeight: '100px',
                          objectFit: 'cover', 
                          borderRadius: '8px',
                          border: '1px solid var(--line)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, bannerUrl: '' }))}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--bad)',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px'
                        }}
                      >
                        x
                      </button>
                    </div>
                  ) : (
                    <label style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '20px'
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span className="muted" style={{ fontSize: '13px' }}>
                        {ct.uploadBanner || 'Click to upload banner image'}
                      </span>
                      <span className="muted" style={{ fontSize: '11px' }}>
                        10:1 ratio recommended (e.g. 1000x100px)
                      </span>
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleBannerUpload(e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Campaign Organizer Team Section */}
              <div style={{ 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '16px', 
                border: '1px solid var(--line)', 
                padding: '20px',
                marginTop: '10px'
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>
                  {ct.teamSectionTitle || 'Campaign Organizer Team'}
                </h3>

                {teamMembers.length === 0 && (
                  <p className="muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
                    {ct.noTeamMembers || 'No team members added yet. Click "Add More" to add organizers or judges.'}
                  </p>
                )}

                {teamMembers.map((member, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '12px', 
                      border: '1px solid var(--line)', 
                      padding: '16px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
                        {ct.teamMember || 'Team Member'} #{index + 1}
                      </span>
                      <button 
                        type="button"
                        onClick={() => removeTeamMember(index)}
                        style={{
                          background: 'rgba(255, 77, 109, 0.15)',
                          border: '1px solid rgba(255, 77, 109, 0.3)',
                          color: 'var(--bad)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {ct.remove || 'Remove'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      {/* Name */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                          {ct.memberName || 'Name:'}
                        </label>
                        <input 
                          type="text" 
                          className="input" 
                          placeholder={ct.memberNamePlaceholder || 'Name'}
                          value={member.name}
                          onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                          maxLength={100}
                          style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                        />
                      </div>

                      {/* Role */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                          {ct.memberRole || 'Role:'}
                        </label>
                        <select 
                          className="input" 
                          value={member.role}
                          onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                          style={{ width: '100%', padding: '10px', fontSize: '13px', cursor: 'pointer' }}
                        >
                          <option value="Organizer">{ct.roleOrganizer || 'Organizer'}</option>
                          <option value="Judge">{ct.roleJudge || 'Judge'}</option>
                        </select>
                      </div>

                      {/* Picture Upload */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                          {ct.uploadPicture || 'Upload Picture'}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {member.pictureUrl ? (
                            <div style={{ position: 'relative' }}>
                              <img 
                                src={getImageUrl(member.pictureUrl)} 
                                alt={member.name || 'Team member'}
                                style={{ 
                                  width: '40px', 
                                  height: '50px', 
                                  objectFit: 'cover', 
                                  borderRadius: '8px',
                                  border: '1px solid var(--line)'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => updateTeamMember(index, 'pictureUrl', '')}
                                style={{
                                  position: 'absolute',
                                  top: '-6px',
                                  right: '-6px',
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: 'var(--bad)',
                                  border: 'none',
                                  color: 'white',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <label style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 12px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid var(--line)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                              </svg>
                              {ct.chooseFile || 'Choose'}
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleTeamMemberPictureUpload(index, e.target.files[0])}
                                style={{ display: 'none' }}
                              />
                            </label>
                          )}
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                          {ct.recommendedRatio || '4:5 ratio recommended'}
                        </span>
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                        {ct.briefBio || 'Brief Bio'}
                      </label>
                      <textarea 
                        className="input" 
                        placeholder={ct.bioPlaceholder || 'Short bio about this team member (max 500 characters)'}
                        value={member.bio}
                        onChange={(e) => updateTeamMember(index, 'bio', e.target.value)}
                        maxLength={500}
                        style={{ width: '100%', minHeight: '60px', resize: 'vertical', padding: '10px', fontSize: '13px' }}
                      />
                      <span style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                        {member.bio.length}/500 {ct.characters || 'characters'}
                      </span>
                    </div>
                  </div>
                ))}

                <button 
                  type="button"
                  onClick={addTeamMember}
                  className="btn"
                  style={{ 
                    width: '100%', 
                    padding: '12px',
                    marginTop: teamMembers.length > 0 ? '8px' : '0'
                  }}
                >
                  {ct.addMore || 'Add More'}
                </button>
              </div>

              {/* Dates */}
              <div className="create-campaign-dates" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                    {ct.startDateLabel || 'Start Date'}
                  </label>
                  <input 
                    type="date" 
                    name="startDate"
                    className="input" 
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                    {ct.endDateLabel || 'End Date'}
                  </label>
                  <input 
                    type="date" 
                    name="endDate"
                    className="input" 
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: '10px' }}>
                <button type="submit" className="btn primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
                  {loading 
                    ? (isEditMode ? (ct.updatingBtn || 'Updating...') : (ct.creatingBtn || 'Creating...'))
                    : (isEditMode ? (ct.updateBtn || 'Update Campaign') : (ct.createBtn || 'Launch Campaign'))
                  }
                </button>
              </div>
            </form>

          </div>
        </main>
      </div>
    </div>
  );
}

export default CreateCampaign;
