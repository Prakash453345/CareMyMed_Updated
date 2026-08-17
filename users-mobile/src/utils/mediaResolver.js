import { API_BASE_URL } from '../lib/api';

/**
 * Normalizes relative backend media URLs (/uploads/chat_attachments/abc.jpg)
 * or local file URIs (file://...) to a fully-qualified URI for React Native Image rendering.
 */
export function resolveChatAttachmentUrl(rawUrl) {
  if (!rawUrl) return null;
  if (typeof rawUrl !== 'string') return null;

  // 1. If already a full http/https or file:// URI, return as-is
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('file://') || rawUrl.startsWith('data:')) {
    return rawUrl;
  }

  // 2. Resolve API host domain
  let host = API_BASE_URL || 'http://localhost:3001/api';
  // Strip trailing /api or / if present
  host = host.replace(/\/api\/?$/, '').replace(/\/+$/, '');

  // 3. Prepend host to relative path
  const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${host}${normalizedPath}`;
}
