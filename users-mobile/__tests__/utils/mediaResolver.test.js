import { resolveChatAttachmentUrl, resolveChatAttachmentSource } from '../../src/utils/mediaResolver';
import { getAccessTokenForRequest } from '../../src/lib/api';

jest.mock('../../src/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3001/api',
  getAccessTokenForRequest: jest.fn(),
}));

describe('mediaResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for null or empty input', () => {
    expect(resolveChatAttachmentUrl(null)).toBeNull();
    expect(resolveChatAttachmentUrl('')).toBeNull();
  });

  it('returns absolute URLs as-is', () => {
    expect(resolveChatAttachmentUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
    expect(resolveChatAttachmentUrl('http://example.com/img.jpg')).toBe('http://example.com/img.jpg');
    expect(resolveChatAttachmentUrl('file:///local/path/img.jpg')).toBe('file:///local/path/img.jpg');
    expect(resolveChatAttachmentUrl('data:image/jpeg;base64,123')).toBe('data:image/jpeg;base64,123');
  });

  it('converts legacy /uploads/chat_attachments/ paths to protected /api/chatbot/attachments/', () => {
    const resolved = resolveChatAttachmentUrl('/uploads/chat_attachments/bidical.jpg');
    expect(resolved).toContain('/api/chatbot/attachments/bidical.jpg');
    expect(resolved).not.toContain('/uploads/chat_attachments/');
  });

  it('attaches Authorization header for protected chatbot attachment endpoints', async () => {
    getAccessTokenForRequest.mockResolvedValueOnce('test-access-token-123');

    const source = await resolveChatAttachmentSource('/api/chatbot/attachments/att_1787391507500');

    expect(getAccessTokenForRequest).toHaveBeenCalled();
    expect(source).toEqual({
      uri: 'http://localhost:3001/api/chatbot/attachments/att_1787391507500',
      headers: { Authorization: 'Bearer test-access-token-123' },
    });
  });

  it('does not attach Authorization header for local file:// URIs', async () => {
    const source = await resolveChatAttachmentSource('file:///local/cache/photo.jpg');

    expect(getAccessTokenForRequest).not.toHaveBeenCalled();
    expect(source).toEqual({
      uri: 'file:///local/cache/photo.jpg',
    });
  });

  it('converts legacy upload URIs and resolves auth headers atomically', async () => {
    getAccessTokenForRequest.mockResolvedValueOnce('jwt-token-xyz');

    const source = await resolveChatAttachmentSource('/uploads/chat_attachments/legacy_med.jpg');

    expect(source).toEqual({
      uri: 'http://localhost:3001/api/chatbot/attachments/legacy_med.jpg',
      headers: { Authorization: 'Bearer jwt-token-xyz' },
    });
  });
});
