import React, { useState, useEffect } from 'react';
import { Image, View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { CircleAlert, RefreshCw } from 'lucide-react-native';
import { API_BASE_URL, getAccessTokenForRequest } from '../lib/api';

/**
 * Normalizes relative backend media URLs (/uploads/chat_attachments/abc.jpg)
 * or local file URIs (file://, content://...) to a fully-qualified URI for React Native Image rendering.
 */
export function resolveChatAttachmentUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let path = rawUrl.trim();

  // 1. If already a full http/https, file://, content://, data:, ph://, or asset:// URI, return as-is immediately
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('file://') ||
    path.startsWith('content://') ||
    path.startsWith('data:') ||
    path.startsWith('ph://') ||
    path.startsWith('asset://')
  ) {
    return path;
  }

  // Convert legacy /uploads/chat_attachments/ paths to protected /api/chatbot/attachments/
  if (path.includes('/uploads/chat_attachments/')) {
    path = path.replace('/uploads/chat_attachments/', '/api/chatbot/attachments/');
  } else if (path.includes('uploads/chat_attachments/')) {
    path = path.replace('uploads/chat_attachments/', 'api/chatbot/attachments/');
  }

  // 2. Resolve API host domain
  let host = API_BASE_URL || 'http://localhost:3001/api';
  // Strip trailing /api or / if present
  host = host.replace(/\/api\/?$/, '').replace(/\/+$/, '');

  // 3. Prepend host to relative path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${host}${normalizedPath}`;
}

/**
 * Resolves image source object { uri, headers } with Authorization token for protected backend endpoints.
 */
export async function resolveChatAttachmentSource(rawUrl) {
  if (!rawUrl) return null;
  const resolvedUrl = resolveChatAttachmentUrl(rawUrl);
  if (!resolvedUrl) return null;

  if (
    resolvedUrl.startsWith('file://') ||
    resolvedUrl.startsWith('content://') ||
    resolvedUrl.startsWith('data:') ||
    resolvedUrl.startsWith('ph://') ||
    resolvedUrl.startsWith('asset://')
  ) {
    return { uri: resolvedUrl };
  }

  if (resolvedUrl.includes('/chatbot/attachments/') || resolvedUrl.includes('/attachments/')) {
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
 * for authenticated media endpoints (/api/chatbot/attachments/), shows a loading spinner,
 * and renders a clear error/retry fallback if the image fails to load.
 */
export function AuthenticatedImage({ source, style, resizeMode = 'contain', fallback = null, onPress, ...props }) {
  const [imageSource, setImageSource] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const rawUri = typeof source === 'string' ? source : source?.uri;
  const isLocalNum = typeof source === 'number';

  const resolveSource = async () => {
    setIsLoading(true);
    setHasError(false);

    if (!source) {
      setImageSource(null);
      setIsLoading(false);
      return;
    }

    if (isLocalNum) {
      setImageSource(source);
      setIsLoading(false);
      return;
    }

    if (!rawUri) {
      setImageSource(null);
      setIsLoading(false);
      return;
    }

    try {
      const resolved = await resolveChatAttachmentSource(rawUri);
      setImageSource(resolved);
    } catch (e) {
      console.warn('[AuthenticatedImage] Failed to resolve source:', e);
      setHasError(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    resolveSource();
    return () => {
      isMounted = false;
    };
  }, [rawUri, isLocalNum ? source : null]);

  // Render error retry card on failure
  if (hasError) {
    return (
      <Pressable
        onPress={() => resolveSource()}
        style={[
          style,
          styles.errorBox,
        ]}
      >
        <CircleAlert size={22} color="#EF4444" strokeWidth={2} />
        <Text style={styles.errorTitle}>Image Unavailable</Text>
        <View style={styles.retryRow}>
          <RefreshCw size={11} color="#64748B" />
          <Text style={styles.errorSub}>Tap to retry</Text>
        </View>
      </Pressable>
    );
  }

  const content = (
    <View style={[style, styles.containerStyle]}>
      {imageSource && (
        <Image
          source={imageSource}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          {...props}
        />
      )}
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <ActivityIndicator size="small" color="#6366F1" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} activeOpacity={0.9}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  containerStyle: {
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
  },
  loadingOverlay: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  errorSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
});
