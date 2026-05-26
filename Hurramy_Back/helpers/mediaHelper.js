// src/helpers/mediaHelper.js
/**
 * Normaliza la ruta de un recurso multimedia (video, thumbnail, avatar).
 * - Si la ruta ya es una URL completa (http/https) se devuelve tal cual.
 * - Si la ruta contiene "uploads/" se asume almacenamiento local y se usa BASE_URL.
 * - En cualquier otro caso se asume que el recurso está en el CDN (S3) y se usa CDN_URL.
 */
function formatMediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const clean = path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (clean.includes('uploads/')) {
    const base = process.env.BASE_URL || '';
    return `${base}/${clean}`;
  }
  const cdn = process.env.CDN_DOMAIN || process.env.CDN_URL || '';
  return `${cdn}/${clean}`;
}

module.exports = { formatMediaUrl };
