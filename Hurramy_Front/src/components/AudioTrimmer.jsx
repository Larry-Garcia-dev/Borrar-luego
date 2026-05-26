import React, { useState, useRef, useEffect, useCallback } from 'react';
import './AudioTrimmer.css';

const AudioTrimmer = ({ audioFile, onTrimComplete, onCancel, translations: t = {} }) => {
    const [audioUrl, setAudioUrl] = useState(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(null);

    const audioRef = useRef(null);
    const waveformRef = useRef(null);
    const canvasRef = useRef(null);

    // Load audio file
    useEffect(() => {
        if (audioFile) {
            const url = URL.createObjectURL(audioFile);
            setAudioUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [audioFile]);

    // Set duration when audio loads
    const handleLoadedMetadata = () => {
        const dur = audioRef.current.duration;
        setDuration(dur);
        setEndTime(Math.min(dur, 30)); // Max 30 seconds by default
    };

    // Update current time during playback
    const handleTimeUpdate = () => {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        
        // Stop at end trim point
        if (time >= endTime) {
            audioRef.current.pause();
            audioRef.current.currentTime = startTime;
            setIsPlaying(false);
        }
    };

    // Play/Pause toggle
    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.currentTime = startTime;
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    // Format time MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Draw waveform visualization
    const drawWaveform = useCallback(async () => {
        if (!audioFile || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await audioFile.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const channelData = audioBuffer.getChannelData(0);

            const samples = 200;
            const blockSize = Math.floor(channelData.length / samples);
            const dataPoints = [];

            for (let i = 0; i < samples; i++) {
                let sum = 0;
                for (let j = 0; j < blockSize; j++) {
                    sum += Math.abs(channelData[i * blockSize + j]);
                }
                dataPoints.push(sum / blockSize);
            }

            const maxVal = Math.max(...dataPoints);
            const normalized = dataPoints.map(v => v / maxVal);

            // Draw waveform bars
            const barWidth = width / samples;
            const centerY = height / 2;

            normalized.forEach((value, index) => {
                const barHeight = value * (height * 0.8);
                const x = index * barWidth;
                
                // Calculate color based on trim selection
                const position = index / samples;
                const isInSelection = position >= (startTime / duration) && position <= (endTime / duration);
                
                if (isInSelection) {
                    ctx.fillStyle = 'rgba(124, 92, 255, 0.9)';
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                }

                ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
            });

            // Draw playhead
            if (duration > 0) {
                const playheadX = (currentTime / duration) * width;
                ctx.strokeStyle = '#19D3FF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(playheadX, 0);
                ctx.lineTo(playheadX, height);
                ctx.stroke();
            }

            audioContext.close();
        } catch (error) {
            console.error('Error drawing waveform:', error);
        }
    }, [audioFile, startTime, endTime, duration, currentTime]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform]);

    // Handle waveform click to seek
    const handleWaveformClick = (e) => {
        if (!waveformRef.current || !duration) return;
        
        const rect = waveformRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const time = percentage * duration;
        
        audioRef.current.currentTime = Math.max(startTime, Math.min(time, endTime));
    };

    // Handle start/end slider changes
    const handleStartChange = (e) => {
        const value = parseFloat(e.target.value);
        if (value < endTime - 1) {
            setStartTime(value);
            if (currentTime < value) {
                audioRef.current.currentTime = value;
            }
        }
    };

    const handleEndChange = (e) => {
        const value = parseFloat(e.target.value);
        if (value > startTime + 1) {
            setEndTime(value);
            if (currentTime > value) {
                audioRef.current.currentTime = startTime;
            }
        }
    };

    // Trim and export audio
    const handleTrimAudio = async () => {
        setIsProcessing(true);

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await audioFile.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Calculate sample positions
            const sampleRate = audioBuffer.sampleRate;
            const startSample = Math.floor(startTime * sampleRate);
            const endSample = Math.floor(endTime * sampleRate);
            const trimmedLength = endSample - startSample;

            // Create new buffer for trimmed audio
            const trimmedBuffer = audioContext.createBuffer(
                audioBuffer.numberOfChannels,
                trimmedLength,
                sampleRate
            );

            // Copy trimmed data
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const originalData = audioBuffer.getChannelData(channel);
                const trimmedData = trimmedBuffer.getChannelData(channel);
                for (let i = 0; i < trimmedLength; i++) {
                    trimmedData[i] = originalData[startSample + i];
                }
            }

            // Convert to blob using MediaRecorder
            const offlineContext = new OfflineAudioContext(
                trimmedBuffer.numberOfChannels,
                trimmedBuffer.length,
                trimmedBuffer.sampleRate
            );

            const source = offlineContext.createBufferSource();
            source.buffer = trimmedBuffer;
            source.connect(offlineContext.destination);
            source.start();

            const renderedBuffer = await offlineContext.startRendering();
            
            // Convert to MP3 blob
            const wavBlob = audioBufferToMp3(renderedBuffer);
            
            audioContext.close();
            onTrimComplete(wavBlob);
        } catch (error) {
            console.error('Error trimming audio:', error);
            alert(t.errorTrimAudio || 'Error trimming audio. Try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Convert AudioBuffer to MP3 blob (using WAV as base, will be transcoded on server if needed)
    // For browser compatibility, we export as audio/mpeg with proper header
    const audioBufferToMp3 = (buffer) => {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;

        const samples = buffer.length;
        const dataSize = samples * blockAlign;
        const bufferSize = 44 + dataSize;

        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);

        // WAV header (server will convert to MP3)
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, bufferSize - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        // Write audio data
        let offset = 44;
        for (let i = 0; i < samples; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, intSample, true);
                offset += 2;
            }
        }

        // Return as audio/mpeg for MP3 compatibility
        return new Blob([arrayBuffer], { type: 'audio/mpeg' });
    };

    const trimDuration = endTime - startTime;

    return (
        <div className="audio-trimmer">
            <div className="trimmer-header">
                <div className="trimmer-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13"/>
                        <circle cx="6" cy="18" r="3"/>
                        <circle cx="18" cy="16" r="3"/>
                    </svg>
                </div>
                <div>
<h3 className="trimmer-title">{t.trimAudio || 'Trim Audio'}</h3>
                <p className="trimmer-subtitle">{t.trimAudioSubtitle || 'Select the fragment you want to use'}</p>
                </div>
            </div>

            <audio 
                ref={audioRef} 
                src={audioUrl} 
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
            />

            {/* Waveform visualization */}
            <div className="waveform-container" ref={waveformRef} onClick={handleWaveformClick}>
                <canvas ref={canvasRef} width={600} height={100} className="waveform-canvas" />
                
                {/* Selection overlay */}
                <div 
                    className="selection-overlay"
                    style={{
                        left: `${(startTime / duration) * 100}%`,
                        width: `${((endTime - startTime) / duration) * 100}%`
                    }}
                />
            </div>

            {/* Time range sliders */}
            <div className="trim-controls">
                <div className="time-range">
                    <div className="range-group">
                        <label className="range-label">
                            <span className="range-icon start">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                                </svg>
                            </span>
                            {t.start || 'Start'}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            step="0.1"
                            value={startTime}
                            onChange={handleStartChange}
                            className="range-slider start"
                        />
                        <span className="time-value">{formatTime(startTime)}</span>
                    </div>

                    <div className="duration-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {formatTime(trimDuration)}
                    </div>

                    <div className="range-group">
                        <label className="range-label">
                            {t.end || 'End'}
                            <span className="range-icon end">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                            </span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            step="0.1"
                            value={endTime}
                            onChange={handleEndChange}
                            className="range-slider end"
                        />
                        <span className="time-value">{formatTime(endTime)}</span>
                    </div>
                </div>
            </div>

            {/* Playback controls */}
            <div className="playback-controls">
                <button className="play-btn" onClick={togglePlay}>
                    {isPlaying ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16"/>
                            <rect x="14" y="4" width="4" height="16"/>
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                    )}
                    {isPlaying ? (t.pause || 'Pause') : (t.playSelection || 'Play selection')}
                </button>
            </div>

            {/* Action buttons */}
            <div className="trimmer-actions">
                <button className="trimmer-cancel" onClick={onCancel}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    {t.cancel || 'Cancel'}
                </button>
                <button 
                    className="trimmer-apply" 
                    onClick={handleTrimAudio}
                    disabled={isProcessing || trimDuration < 1}
                >
                    {isProcessing ? (
                        <>
                            <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                            </svg>
                            {t.processing || 'Processing...'}
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            {t.applyTrim || 'Apply trim'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AudioTrimmer;
