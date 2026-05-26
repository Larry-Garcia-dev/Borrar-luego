// server/utils/urlHelper.js
// Dominio CDN de Alibaba Cloud para archivos media
const CDN_DOMAIN = process.env.CDN_DOMAIN || 'https://media.hurammy.com';

/**
 * Genera la URL completa del CDN para un archivo
 * @param {string} fileName - Ruta relativa del archivo (ej: videos/vid-123.mp4)
 * @returns {string|null} - URL completa del CDN o null si no hay archivo
 */
function getCdnUrl(fileName) {
  if (!fileName) return null;
  // Si ya es una URL completa, devolverla tal cual
  if (fileName.startsWith('http')) return fileName;
  // Si es una ruta de uploads local (avatares legacy), no usar CDN
  if (fileName.startsWith('/uploads') || fileName.startsWith('uploads')) return null;
  // Limpiar la ruta y construir URL del CDN
  const cleanPath = fileName.replace(/^\/+/, '').replace(/\\/g, '/');
  return `${CDN_DOMAIN}/${cleanPath}`;
}

/**
 * Verifica si una ruta es de OSS/CDN (videos y thumbnails nuevos)
 * @param {string} path - Ruta del archivo
 * @returns {boolean}
 */
function isOssPath(path) {
  if (!path) return false;
  return path.startsWith('videos/') || path.startsWith('thumbnails/');
}

module.exports = { getCdnUrl, isOssPath, CDN_DOMAIN };
