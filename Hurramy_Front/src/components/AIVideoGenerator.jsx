import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { generateVideo, checkVideoStatus, uploadImage, uploadAudio, uploadTrimmedAudio } from '../services/aiService';
import { API_URL } from '../config';
import AudioTrimmer from './AudioTrimmer';
import './AIVideoGenerator.css';

// WAi Coins pricing chart
const COIN_PRICING = {
    '720P': { 5: 10, 10: 20, 15: 30 },
    '1080P': { 5: 15, 10: 30, 15: 45 }
};

const AIVideoGenerator = ({ translations: t = {} }) => {
    // Get user from localStorage initially
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loadingUser, setLoadingUser] = useState(false);

    // Fetch fresh user data from server on mount
    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            setLoadingUser(true);
            try {
                const response = await axios.get(`${API_URL}/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const freshUser = response.data;
                setUser(freshUser);
                localStorage.setItem('user', JSON.stringify(freshUser));
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoadingUser(false);
            }
        };

        fetchUserData();
    }, []);
    const [formData, setFormData] = useState({
        prompt: '',
        img_url: '',
        audio_url: '',
        quality: '720P',
        duration: 5
    });
    const [status, setStatus] = useState('IDLE');
    const [taskId, setTaskId] = useState(null);
    const [videoResult, setVideoResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [progress, setProgress] = useState(0);

    // Upload states
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [audioFile, setAudioFile] = useState(null);
    const [audioName, setAudioName] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUploadingAudio, setIsUploadingAudio] = useState(false);
    const [showAudioTrimmer, setShowAudioTrimmer] = useState(false);

    // Refs
    const imageInputRef = useRef(null);
    const audioInputRef = useRef(null);

    // Calculate coin cost based on quality and duration
    const coinCost = useMemo(() => {
        return COIN_PRICING[formData.quality]?.[formData.duration] || 10;
    }, [formData.quality, formData.duration]);

    // Check if user has enough coins
    const hasEnoughCoins = user ? user.waiCoins >= coinCost : false;
    const isAccountFrozen = user?.coinsFrozen || false;

    // Handle image file selection
    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        setImageFile(file);
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);

        // Upload
        setIsUploadingImage(true);
        try {
            const response = await uploadImage(file);
            setFormData(prev => ({ ...prev, img_url: response.url }));
        } catch (error) {
            setErrorMessage((t.errorUploadImage || 'Error uploading image') + ': ' + (error.message || error));
            setImageFile(null);
            setImagePreview(null);
        } finally {
            setIsUploadingImage(false);
        }
    };

    // Handle audio file selection
    const handleAudioSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setAudioFile(file);
        setAudioName(file.name);
        setShowAudioTrimmer(true);
    };

    // Handle trimmed audio
    const handleTrimComplete = async (trimmedBlob) => {
        setShowAudioTrimmer(false);
        setIsUploadingAudio(true);

        try {
            const response = await uploadTrimmedAudio(trimmedBlob, 'audio-recortado.mp3');
            setFormData(prev => ({ ...prev, audio_url: response.url }));
            setAudioName(t.trimmedAudioReady || 'Trimmed audio ready');
        } catch (error) {
            setErrorMessage((t.errorUploadAudio || 'Error uploading audio') + ': ' + (error.message || error));
            setAudioFile(null);
            setAudioName('');
        } finally {
            setIsUploadingAudio(false);
        }
    };

    // Cancel audio trimming
    const handleTrimCancel = () => {
        setShowAudioTrimmer(false);
        setAudioFile(null);
        setAudioName('');
        if (audioInputRef.current) {
            audioInputRef.current.value = '';
        }
    };

    // Use audio without trimming
    const handleUseFullAudio = async () => {
        if (!audioFile) return;
        
        setShowAudioTrimmer(false);
        setIsUploadingAudio(true);

        try {
            const response = await uploadAudio(audioFile);
            setFormData(prev => ({ ...prev, audio_url: response.url }));
            setAudioName(audioFile.name);
        } catch (error) {
            setErrorMessage((t.errorUploadAudio || 'Error uploading audio') + ': ' + (error.message || error));
            setAudioFile(null);
            setAudioName('');
        } finally {
            setIsUploadingAudio(false);
        }
    };

    // Remove image
    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setFormData(prev => ({ ...prev, img_url: '' }));
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    };

    // Remove audio
    const removeAudio = () => {
        setAudioFile(null);
        setAudioName('');
        setFormData(prev => ({ ...prev, audio_url: '' }));
        if (audioInputRef.current) {
            audioInputRef.current.value = '';
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if user is logged in
        if (!user) {
            setErrorMessage(t.loginRequired || 'Please log in to generate videos');
            setStatus('ERROR');
            return;
        }

        // Check if account is frozen
        if (isAccountFrozen) {
            setErrorMessage(t.accountFrozen || 'Your WAi Coins account is frozen. Contact administrator.');
            setStatus('ERROR');
            return;
        }

        // Check if user has enough coins
        if (!hasEnoughCoins) {
            setErrorMessage(
                (t.insufficientCoins || 'Insufficient WAi Coins. You need {required} but have {available}.')
                    .replace('{required}', coinCost)
                    .replace('{available}', user.waiCoins || 0)
            );
            setStatus('ERROR');
            return;
        }

        setStatus('LOADING');
        setErrorMessage('');
        setVideoResult(null);
        setProgress(0);

        try {
            // Include userId in the request for coin deduction
            const data = await generateVideo({
                ...formData,
                userId: user.id
            });
            const newTaskId = data.task.output.task_id; 
            setTaskId(newTaskId);
            setStatus('PROCESSING');

            // Update user's coin balance in localStorage
            if (data.remainingCoins !== undefined && data.remainingCoins !== null) {
                const updatedUser = { ...user, waiCoins: data.remainingCoins };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
        } catch (error) {
            setStatus('ERROR');
            // Handle specific error codes
            if (error.code === 'COINS_FROZEN') {
                setErrorMessage(t.accountFrozen || 'Your WAi Coins account is frozen. Contact administrator.');
            } else if (error.code === 'INSUFFICIENT_COINS') {
                setErrorMessage(
                    (t.insufficientCoins || 'Insufficient WAi Coins. You need {required} but have {available}.')
                        .replace('{required}', error.required || coinCost)
                        .replace('{available}', error.available || 0)
                );
            } else {
                setErrorMessage(error.message || (t.errorStartGeneration || 'Error starting generation'));
            }
        }
    };

    // Polling logic
    useEffect(() => {
        let intervalId;
        let progressInterval;

        if (status === 'PROCESSING' && taskId) {
            progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 2, 90));
            }, 1000);

            intervalId = setInterval(async () => {
                try {
                    const response = await checkVideoStatus(taskId);
                    const taskStatus = response.data.output.task_status;

                    if (taskStatus === 'SUCCEEDED') {
                        setStatus('SUCCESS');
                        setProgress(100);
                        setVideoResult(response.data.output.video_url);
                        clearInterval(intervalId);
                        clearInterval(progressInterval);
                    } else if (taskStatus === 'FAILED') {
                        setStatus('ERROR');
                        setErrorMessage(t.aiFailed || 'AI failed to generate the video.');
                        clearInterval(intervalId);
                        clearInterval(progressInterval);
                    }
                } catch (error) {
                    setStatus('ERROR');
                    setErrorMessage(t.connectionLost || 'Lost connection to server while checking status.');
                    clearInterval(intervalId);
                    clearInterval(progressInterval);
                }
            }, 5000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            if (progressInterval) clearInterval(progressInterval);
        };
    }, [status, taskId]);

    const resetForm = () => {
        setFormData({ prompt: '', img_url: '', audio_url: '', quality: '720P', duration: 5 });
        setStatus('IDLE');
        setTaskId(null);
        setVideoResult(null);
        setErrorMessage('');
        setProgress(0);
        setImageFile(null);
        setImagePreview(null);
        setAudioFile(null);
        setAudioName('');
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (audioInputRef.current) audioInputRef.current.value = '';
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    return (
        <div className="ai-generator">
            {/* Header */}
            <div className="ai-generator-header">
                <div className="ai-generator-icon">
                    <img src="/ai-logo.png" alt="AI" width="36" height="36" style={{ objectFit: 'contain' }} />
                </div>
                <div>
                    <h2 className="ai-generator-title">{t.generatorTitle || 'AI Video Generator'}</h2>
                    <p className="ai-generator-subtitle">{t.generatorSubtitle || 'Create amazing videos from an image and description'}</p>
                </div>
            </div>

            {/* Status Badge */}
            <div className="ai-status-row">
                <span className={`ai-status-badge ${status.toLowerCase()}`}>
                    <span className="ai-status-dot"></span>
                    {status === 'IDLE' && (t.readyToCreate || 'Ready to create')}
                    {status === 'LOADING' && (t.starting || 'Starting...')}
                    {status === 'PROCESSING' && (t.generatingVideo || 'Generating video...')}
                    {status === 'SUCCESS' && (t.completed || 'Completed')}
                    {status === 'ERROR' && (t.error || 'Error')}
                </span>
            </div>

            {/* Audio Trimmer Modal */}
            {showAudioTrimmer && audioFile && (
                <div className="ai-modal-overlay">
                    <div className="ai-modal-content">
                        <AudioTrimmer 
                            audioFile={audioFile}
                            onTrimComplete={handleTrimComplete}
                            onCancel={handleTrimCancel}
                            translations={t}
                        />
                        <button className="ai-use-full-btn" onClick={handleUseFullAudio}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18V5l12-2v13"/>
                                <circle cx="6" cy="18" r="3"/>
                                <circle cx="18" cy="16" r="3"/>
                            </svg>
                            {t.useFullAudio || 'Use full audio without trimming'}
                        </button>
                    </div>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="ai-form">
                {/* Prompt */}
                <div className="ai-form-group">
                    <label className="ai-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        {t.descriptionLabel || 'Video description'}
                    </label>
                    <textarea 
                        name="prompt"
                        value={formData.prompt}
                        onChange={handleChange}
                        required
                        className="ai-textarea"
                        placeholder={t.descriptionPlaceholder || 'Describe what you want to happen in the video...'}
                        rows="4"
                        disabled={status === 'LOADING' || status === 'PROCESSING'}
                    />
                </div>

                {/* Image Upload */}
                <div className="ai-form-group">
                    <label className="ai-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        {t.baseImage || 'Base image'}
                    </label>

                    {!imagePreview ? (
                        <div 
                            className="ai-upload-zone"
                            onClick={() => imageInputRef.current?.click()}
                        >
                            <input 
                                ref={imageInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleImageSelect}
                                hidden
                                disabled={status === 'LOADING' || status === 'PROCESSING'}
                            />
                            <div className="ai-upload-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                            </div>
                            <p className="ai-upload-text">{t.clickOrDragImage || 'Click or drag an image'}</p>
                            <span className="ai-upload-hint">{t.imageHint || 'JPG, PNG, WEBP, GIF - Max 10MB'}</span>
                        </div>
                    ) : (
                        <div className="ai-preview-container">
                            <img src={imagePreview} alt="Preview" className="ai-image-preview" />
                            {isUploadingImage && (
                                <div className="ai-upload-loading">
                                    <svg className="ai-spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                    </svg>
                                    <span>{t.uploading || 'Uploading...'}</span>
                                </div>
                            )}
                            {!isUploadingImage && formData.img_url && (
                                <div className="ai-preview-success">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    {t.imageReady || 'Image ready'}
                                </div>
                            )}
                            <button 
                                type="button" 
                                className="ai-remove-btn"
                                onClick={removeImage}
                                disabled={status === 'LOADING' || status === 'PROCESSING'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Audio Upload */}
                <div className="ai-form-group">
                    <label className="ai-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18V5l12-2v13"/>
                            <circle cx="6" cy="18" r="3"/>
                            <circle cx="18" cy="16" r="3"/>
                        </svg>
                        {t.audioLabel || 'Audio'}
                        <span className="ai-label-optional">{t.audioOptional || '(Optional - You can trim it)'}</span>
                    </label>

                    {!audioName ? (
                        <div 
                            className="ai-upload-zone audio"
                            onClick={() => audioInputRef.current?.click()}
                        >
                            <input 
                                ref={audioInputRef}
                                type="file"
                                accept=".mp3,audio/mpeg"
                                onChange={handleAudioSelect}
                                hidden
                                disabled={status === 'LOADING' || status === 'PROCESSING'}
                            />
                            <div className="ai-upload-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M9 18V5l12-2v13"/>
                                    <circle cx="6" cy="18" r="3"/>
                                    <circle cx="18" cy="16" r="3"/>
                                </svg>
                            </div>
                            <p className="ai-upload-text">{t.clickToSelectAudio || 'Click to select audio'}</p>
                            <span className="ai-upload-hint">{t.audioHint || 'MP3 only - You can trim it'}</span>
                        </div>
                    ) : (
                        <div className="ai-audio-preview">
                            <div className="ai-audio-info">
                                <div className="ai-audio-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 18V5l12-2v13"/>
                                        <circle cx="6" cy="18" r="3"/>
                                        <circle cx="18" cy="16" r="3"/>
                                    </svg>
                                </div>
                                <div className="ai-audio-details">
                                    <span className="ai-audio-name">{audioName}</span>
                                    {isUploadingAudio ? (
                                        <span className="ai-audio-status uploading">
                                            <svg className="ai-spinner" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                            </svg>
                                            {t.uploading || 'Uploading...'}
                                        </span>
                                    ) : formData.audio_url ? (
                                        <span className="ai-audio-status ready">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="20 6 9 17 4 12"/>
                                            </svg>
                                            {t.readyToUse || 'Ready to use'}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            <button 
                                type="button" 
                                className="ai-remove-audio-btn"
                                onClick={removeAudio}
                                disabled={status === 'LOADING' || status === 'PROCESSING' || isUploadingAudio}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Quality and Duration Row */}
                <div className="ai-form-row">
                    {/* Video Quality */}
                    <div className="ai-form-group">
                        <label className="ai-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                <line x1="8" y1="21" x2="16" y2="21"/>
                                <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                            {t.qualityLabel || 'Quality'}
                        </label>
                        <div className="ai-select-group">
                            <button
                                type="button"
                                className={`ai-select-btn ${formData.quality === '720P' ? 'active' : ''}`}
                                onClick={() => setFormData(prev => ({ ...prev, quality: '720P' }))}
                                disabled={status === 'LOADING' || status === 'PROCESSING'}
                            >
                                720P
                            </button>
                            <button
                                type="button"
                                className={`ai-select-btn ${formData.quality === '1080P' ? 'active' : ''}`}
                                onClick={() => setFormData(prev => ({ ...prev, quality: '1080P' }))}
                                disabled={status === 'LOADING' || status === 'PROCESSING'}
                            >
                                1080P
                            </button>
                        </div>
                    </div>

                    {/* Video Duration */}
                    <div className="ai-form-group">
                        <label className="ai-label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {t.durationLabel || 'Duration'}
                        </label>
                        <div className="ai-select-group">
                            <button
                                type="button"
                                className={`ai-select-btn ${formData.duration === 5 ? 'active' : ''}`}
                                onClick={() => setFormData(prev => ({ ...prev, duration: 5 }))}
                                disabled={status === 'LOADING' || status === 'PROCESSING'}
                            >
                                5s
                            </button>
                            <button
                                type="button"
                                className={`ai-select-btn ${formData.duration === 10 ? 'active' : ''}`}
                                onClick={() => setFormData(prev => ({ ...prev, duration: 10 }))}
                                disabled={status === 'LOADING' || status === 'PROCESSING'}
                            >
                                10s
                            </button>
                            <button
                                type="button"
                                className={`ai-select-btn ${formData.duration === 15 ? 'active' : ''}`}
                                onClick={() => setFormData(prev => ({ ...prev, duration: 15 }))}
                                disabled={status === 'LOADING' || status === 'PROCESSING'}
                            >
                                15s
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                {(status === 'LOADING' || status === 'PROCESSING') && (
                    <div className="ai-progress-container">
                        <div className="ai-progress-bar">
                            <div 
                                className="ai-progress-fill" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="ai-progress-text">{progress}%</span>
                    </div>
                )}

                {/* WAi Coins Cost Display */}
                <div className="ai-coin-cost-container">
                    <div className="ai-coin-cost">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v12"/>
                            <path d="M15 9.5c0-1.5-1.5-2.5-3-2.5s-3 1-3 2.5 1.5 2 3 2.5 3 1 3 2.5-1.5 2.5-3 2.5-3-1-3-2.5"/>
                        </svg>
                        <span className="ai-coin-label">{t.coinCost || 'Cost'}:</span>
                        <span className={`ai-coin-value ${!hasEnoughCoins ? 'insufficient' : ''}`}>
                            {coinCost} WAi Coins
                        </span>
                    </div>
                    {user && (
                        <div className={`ai-coin-balance ${isAccountFrozen ? 'frozen' : ''}`}>
                            <span>{t.yourBalance || 'Your balance'}:</span>
                            <span className={`ai-balance-value ${!hasEnoughCoins ? 'low' : ''}`}>
                                {user.waiCoins ?? 0} WAi Coins
                            </span>
                            {isAccountFrozen && (
                                <span className="ai-frozen-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    {t.frozen || 'Frozen'}
                                </span>
                            )}
                        </div>
                    )}
                    {!hasEnoughCoins && user && !isAccountFrozen && (
                        <div className="ai-coin-warning">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                            {t.notEnoughCoins || 'Not enough coins to generate this video'}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button 
                    type="submit" 
                    disabled={status === 'LOADING' || status === 'PROCESSING' || !formData.img_url || isUploadingImage || isUploadingAudio || !hasEnoughCoins || isAccountFrozen || !user}
                    className="ai-submit-btn"
                >
                    {status === 'LOADING' || status === 'PROCESSING' ? (
                        <>
                            <svg className="ai-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                            </svg>
                            {status === 'LOADING' ? (t.starting || 'Starting...') : (t.generatingVideo || 'Generating video...')}
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                            </svg>
                            {t.generateBtn || 'Generate Video'}
                        </>
                    )}
                </button>
            </form>

            {/* Error Message */}
            {status === 'ERROR' && (
                <div className="ai-error-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>{errorMessage}</span>
                    <button className="ai-retry-btn" onClick={resetForm}>
                        {t.retryBtn || 'Retry'}
                    </button>
                </div>
            )}

            {/* Success Result */}
            {status === 'SUCCESS' && videoResult && (
                <div className="ai-success-box">
                    <div className="ai-success-header">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        <span>{t.videoGenerated || 'Video generated successfully'}</span>
                    </div>
                    <div className="ai-video-container">
                        <video controls className="ai-video-player">
                            <source src={videoResult} type="video/mp4" />
                            Your browser does not support the video element.
                        </video>
                    </div>
                    <div className="ai-success-actions">
                        <a href={videoResult} download className="ai-download-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            {t.downloadBtn || 'Download'}
                        </a>
                        <button className="ai-new-btn" onClick={resetForm}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            {t.createNewBtn || 'Create new'}
                        </button>
                    </div>
                </div>
            )}

            {/* Tips Section */}
            {status === 'IDLE' && (
                <div className="ai-tips">
                    <h4 className="ai-tips-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        {t.tipsTitle || 'Tips for better results'}
                    </h4>
                    <ul className="ai-tips-list">
                        <li>{t.tip1 || 'Use high resolution images (minimum 720p)'}</li>
                        <li>{t.tip2 || 'Describe the desired movement in detail'}</li>
                        <li>{t.tip3 || 'You can trim the audio when uploading'}</li>
                        <li>{t.tip4 || 'Generation can take between 1-5 minutes'}</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default AIVideoGenerator;
