import { CDN_DOMAIN, BASE_URL } from '../config';

/**
 * Genera la URL completa para videos.
 * @param {string} path - Ruta del video en la BD (ej. 'videos/vid-123.mp4')
 * @returns {string} - URL lista para usar en <video src={...}>
 */
export const getVideoUrl = (path) => {
  if (!path) return '';

  // Si es una URL externa o ya viene completa
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Limpiar la ruta (quitar slash inicial y backslashes)
  const cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');

  // Los videos nuevos van por CDN
  return `${CDN_DOMAIN}/${cleanPath}`;
};

/**
 * Genera la URL completa para thumbnails/miniaturas.
 * @param {string} path - Ruta del thumbnail en la BD (ej. 'thumbnails/thumb-123.jpg')
 * @returns {string|null} - URL lista para usar en <img src={...}> o null si no hay thumbnail
 */
export const getThumbnailUrl = (path) => {
  if (!path) return null;

  // Si es una URL externa o ya viene completa
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Limpiar la ruta
  const cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');

  // Los thumbnails nuevos van por CDN
  return `${CDN_DOMAIN}/${cleanPath}`;
};

/**
 * Genera la URL completa para avatares de usuario.
 * @param {string} path - Ruta del avatar en la BD (ej. '/uploads/avatars/avatar-123.jpg')
 * @returns {string|null} - URL lista para usar en <img src={...}> o null si no hay avatar
 */
export const getAvatarUrl = (path) => {
  if (!path) return null;

  // Si es una URL externa o ya viene completa
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Limpiar la ruta
  const cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');

  // Los avatares pueden estar en el servidor local o en CDN
  // Si la ruta incluye 'uploads/', es archivo local del servidor
  if (cleanPath.includes('uploads/')) {
    return `${BASE_URL}/${cleanPath}`;
  }

  // De lo contrario, asumimos que está en CDN
  return `${CDN_DOMAIN}/${cleanPath}`;
};

/**
 * Genera la URL completa para cualquier archivo media.
 * Detecta automáticamente el tipo basándose en la ruta.
 * @param {string} path - Ruta del archivo en la BD
 * @param {string} type - Tipo de archivo: 'video' | 'thumbnail' | 'avatar' | 'auto'
 * @returns {string} - URL completa del archivo
 */
export const getMediaUrl = (path, type = 'auto') => {
  if (!path) return '';

  // Si es una URL externa o ya viene completa
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Limpiar la ruta
  const cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');

  // Si es un archivo local (uploads/), servir desde el backend
  if (cleanPath.includes('uploads/')) {
    return `${BASE_URL}/${cleanPath}`;
  }

  // Para archivos nuevos en CDN
  return `${CDN_DOMAIN}/${cleanPath}`;
};
