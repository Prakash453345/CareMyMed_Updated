import { resolveChatAttachmentUrl } from '../../src/utils/mediaResolver';

describe('mediaResolver', () => {
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

  it('prepends API host domain to relative upload paths', () => {
    const resolved = resolveChatAttachmentUrl('/uploads/chat_attachments/bidical.jpg');
    expect(resolved).toContain('/uploads/chat_attachments/bidical.jpg');
  });
});
