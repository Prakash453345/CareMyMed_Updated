process.env.NODE_ENV = 'test';

function fakeId(val) {
  const s = String(val);
  return {
    toString: () => s,
    toJSON: () => s,
    equals: (o) => s === String(o?._id ?? o),
  };
}

const mockAuthState = {
  user: { id: 'patient-user', supabaseUid: 'patient-user' },
  profile: {
    _id: fakeId('patient-profile-id'),
    supabaseUid: 'patient-user',
    role: 'patient',
    subscription: {
      status: 'active',
      expires_at: new Date(Date.now() + 86400000),
    },
  },
};

// Mock authentication
jest.mock('../../src/middleware/authenticate', () => ({
  authenticate: (req, res, next) => {
    req.user = mockAuthState.user;
    req.profile = mockAuthState.profile;
    req.auth = {
      userId: mockAuthState.profile?._id,
      userType: 'Patient',
    };
    next();
  },
  authenticateSession: (req, res, next) => next(),
  optionalAuthenticate: (req, res, next) => next(),
  requireRole:
    (...allowed) =>
    (req, res, next) =>
      next(),
  requireOrganization: () => (req, res, next) => next(),
  requireOwnership: () => (req, res, next) => next(),
}));

// Mock rate limiters
jest.mock('../../src/middleware/rateLimiter', () => ({
  otpRateLimiter: (req, res, next) => next(),
  aiChatRateLimiter: (req, res, next) => next(),
  aiChatIpRateLimiter: (req, res, next) => next(),
  aiChatPatientRateLimiter: (req, res, next) => next(),
  aiChatSessionRateLimiter: (req, res, next) => next(),
}));

// Mock Mongoose models
jest.mock('../../src/models/AIChatSession');
jest.mock('../../src/models/AuditLog');

const request = require('supertest');
const app = require('../../src/server');
const AIChatSession = require('../../src/models/AIChatSession');

describe('Chatbot Sessions Route Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/chatbot/sessions', () => {
    it('returns active sessions list for the authenticated patient', async () => {
      const mockSessions = [
        {
          _id: 'session-1',
          title: 'Diabetes Query',
          message_count: 5,
          created_at: new Date().toISOString(),
        },
      ];

      AIChatSession.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockSessions),
        }),
      });

      const res = await request(app).get('/api/chatbot/sessions');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockSessions);
      expect(AIChatSession.find).toHaveBeenCalledWith(
        expect.objectContaining({
          patient_id: mockAuthState.profile._id,
          is_active: true,
        })
      );
    });
  });

  describe('POST /api/chatbot/sessions', () => {
    it('creates a new chat session when active count is less than 10', async () => {
      AIChatSession.countDocuments = jest.fn().mockResolvedValue(4);
      const mockCreatedSession = {
        _id: 'session-new',
        title: 'New Chat',
        is_active: true,
        message_count: 1,
        messages: [{ role: 'assistant', text: 'Disclaimer text' }],
      };
      AIChatSession.create = jest.fn().mockResolvedValue(mockCreatedSession);

      const res = await request(app).post('/api/chatbot/sessions');
      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockCreatedSession);
      expect(AIChatSession.countDocuments).toHaveBeenCalledWith({
        patient_id: mockAuthState.profile._id,
        is_active: true,
      });
      expect(AIChatSession.create).toHaveBeenCalled();
    });

    it('returns 400 when active sessions count is 10 or more', async () => {
      AIChatSession.countDocuments = jest.fn().mockResolvedValue(10);

      const res = await request(app).post('/api/chatbot/sessions');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Limit reached');
      expect(AIChatSession.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/chatbot/sessions/:id', () => {
    it('returns session details with structured attachments if found and matches patient context', async () => {
      const mockSession = {
        _id: 'session-1',
        title: 'Existing Chat',
        messages: [
          { role: 'assistant', text: 'Disclaimer' },
          {
            role: 'user',
            text: "What's this medicine for?",
            image: '/api/chatbot/attachments/att_123',
            attachments: [
              {
                attachmentId: 'att_123',
                type: 'image',
                url: '/api/chatbot/attachments/att_123',
                mimeType: 'image/jpeg',
                fileName: 'Bidical.jpg',
                storagePath: 'chat_123.jpg',
              },
            ],
          },
        ],
      };
      AIChatSession.findOne = jest.fn().mockResolvedValue(mockSession);

      const res = await request(app).get('/api/chatbot/sessions/session-1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockSession);
      expect(res.body.messages[1].attachments[0].url).toContain('/api/chatbot/attachments/');
      expect(res.body.messages[1].image).not.toContain('base64');
      expect(AIChatSession.findOne).toHaveBeenCalledWith({
        _id: 'session-1',
        patient_id: mockAuthState.profile._id,
        is_active: true,
      });
    });

    it('returns 404 if session is not found', async () => {
      AIChatSession.findOne = jest.fn().mockResolvedValue(null);

      const res = await request(app).get(
        '/api/chatbot/sessions/missing-session'
      );
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/chatbot/sessions/:id', () => {
    it('soft deletes the session successfully', async () => {
      AIChatSession.updateOne = jest
        .fn()
        .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const res = await request(app).delete('/api/chatbot/sessions/session-1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(AIChatSession.updateOne).toHaveBeenCalledWith(
        {
          _id: 'session-1',
          patient_id: mockAuthState.profile._id,
          is_active: true,
        },
        { $set: { is_active: false } }
      );
    });

    it('returns 404 if session is not matched or already deleted', async () => {
      AIChatSession.updateOne = jest
        .fn()
        .mockResolvedValue({ matchedCount: 0 });

      const res = await request(app).delete(
        '/api/chatbot/sessions/deleted-session'
      );
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/chatbot/attachments/:attachmentId Security', () => {
    it('denies access (404/403) when user does not own session containing attachment', async () => {
      AIChatSession.findOne = jest.fn().mockResolvedValue(null);

      const res = await request(app).get('/api/chatbot/attachments/unauthorized_att');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found|access denied/i);
    });

    it('rejects path traversal attempts with 400', async () => {
      const res = await request(app).get('/api/chatbot/attachments/..%2F..%2Fetc%2Fpasswd');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('serves attachment file bytes when user owns session and file exists', async () => {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.resolve(__dirname, '../../src/uploads/chat_attachments');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const testFilePath = path.join(uploadsDir, 'test_attachment_file.jpg');
      fs.writeFileSync(testFilePath, 'dummy image content');

      const mockSession = {
        _id: 'session-att',
        patient_id: mockAuthState.profile._id,
        messages: [
          {
            role: 'user',
            attachments: [
              {
                attachmentId: 'att_test_123',
                storagePath: 'test_attachment_file.jpg',
                url: '/api/chatbot/attachments/att_test_123',
              },
            ],
          },
        ],
      };
      AIChatSession.findOne = jest.fn().mockResolvedValue(mockSession);

      const res = await request(app).get('/api/chatbot/attachments/att_test_123');
      expect(res.status).toBe(200);

      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });
  });
});
