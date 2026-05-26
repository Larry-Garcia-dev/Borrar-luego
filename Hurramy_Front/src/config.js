const isProd = import.meta.env.MODE === 'production';

// URL base para el backend (API)
export const BASE_URL = isProd ? 'https://hurammy.com' : 'http://localhost:5000';
export const API_URL = `${BASE_URL}/api`;

// ==========================================
// 🚀 CONFIGURACIÓN DE ALIBABA CLOUD CDN
// ==========================================

// Dominio CDN de Alibaba Cloud para archivos media (videos, imágenes, thumbnails)
// Las funciones de URL están centralizadas en utils/mediaUtils.js
export const CDN_DOMAIN = 'https://media.hurammy.com';
