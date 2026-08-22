import React, { useState, useEffect } from 'react';
import { Image, View } from 'react-native';
import { API_BASE_URL, getAccessTokenForRequest } from '../lib/api';

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

/**
 * Resolves image source object { uri, headers } with Authorization token for protected backend endpoints.
 */
export async function resolveChatAttachmentSource(rawUrl) {
  if (!rawUrl) return null;
  const resolvedUrl = resolveChatAttachmentUrl(rawUrl);
  if (!resolvedUrl) return null;

  if (resolvedUrl.startsWith('file://') || resolvedUrl.startsWith('data:')) {
    return { uri: resolvedUrl };
  }

  if (resolvedUrl.includes('/chatbot/attachments/')) {
    try {
      const token = await getAccessTokenForRequest();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      return { uri: resolvedUrl, headers };
    } catch {
      return { uri: resolvedUrl };
    }
  }

  return { uri: resolvedUrl };
}

/**
 * React Native Image component wrapper that automatically injects Authorization headers
 * for authenticated media endpoints (/api/chatbot/attachments/).
 */
export function AuthenticatedImage({ source, style, resizeMode, fallback = null, ...props }) {
  const [imageSource, setImageSource] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const resolveSource = async () => {
      if (!source) {
        if (isMounted) setImageSource(null);
        return;
      }

      if (typeof source === 'number') {
        if (isMounted) setImageSource(source);
        return;
      }

      const rawUri = typeof source === 'string' ? source : source?.uri;
      if (!rawUri) {
        if (isMounted) setImageSource(null);
        return;
      }

      const resolved = await resolveChatAttachmentSource(rawUri);
      if (isMounted) setImageSource(resolved);
    };

    resolveSource();
    return () => {
      isMounted = false;
    };
  }, [source]);

  if (!imageSource) {
    return fallback || <View style={[style, { backgroundColor: '#F1F5F9' }]} />;
  }

  return (
    <Image
      source={imageSource}
      style={style}
      resizeMode={resizeMode}
      {...props}
    />
  );
}
