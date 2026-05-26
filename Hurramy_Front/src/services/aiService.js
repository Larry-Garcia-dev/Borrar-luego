import axios from 'axios';
import { API_URL as BASE_API_URL } from '../config';

// Usa la URL base de la configuración para conectar con el backend
const API_URL = `${BASE_API_URL}/ai`; 

/**
 * Obtiene el header de autorización con el token actual
 */
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Sube una imagen local para la IA
 */
export const uploadImage = async (file) => {
    try {
        const formData = new FormData();
        formData.append('ai_image', file);

        const response = await axios.post(`${API_URL}/upload-image`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...getAuthHeader()
            }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

/**
 * Sube un audio local para la IA
 */
export const uploadAudio = async (file) => {
    try {
        const formData = new FormData();
        formData.append('ai_audio', file);

        const response = await axios.post(`${API_URL}/upload-audio`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...getAuthHeader()
            }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

/**
 * Sube un audio recortado (blob) para la IA
 */
export const uploadTrimmedAudio = async (blob, filename = 'trimmed-audio.webm') => {
    try {
        const formData = new FormData();
        formData.append('ai_audio', blob, filename);

        const response = await axios.post(`${API_URL}/upload-trimmed-audio`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...getAuthHeader()
            }
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

/**
 * Envía los datos para iniciar la generación del video
 */
export const generateVideo = async (videoData) => {
    try {
        const response = await axios.post(`${API_URL}/generate`, videoData, {
            headers: getAuthHeader()
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

/**
 * Consulta el estado actual de la tarea de generación
 */
export const checkVideoStatus = async (taskId) => {
    try {
        const response = await axios.get(`${API_URL}/task/${taskId}`, {
            headers: getAuthHeader()
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};
