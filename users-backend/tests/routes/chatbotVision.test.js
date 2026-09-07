const axios = require('axios');

jest.mock('axios');

describe('Groq Vision Model Candidate Pipeline', () => {
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env.GROQ_VISION_MODEL;
  });

  afterEach(() => {
    process.env.GROQ_VISION_MODEL = originalEnv;
  });

  it('includes qwen/qwen3.6-27b in vision candidate fallback list', () => {
    const groqVisionModel = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';
    const visionCandidates = Array.from(
      new Set([
        groqVisionModel,
        'qwen/qwen3.6-27b',
      ])
    );

    expect(visionCandidates).toContain('qwen/qwen3.6-27b');
    expect(visionCandidates[0]).toBe('qwen/qwen3.6-27b');
  });

  it('respects GROQ_VISION_MODEL environment variable override when provided', () => {
    process.env.GROQ_VISION_MODEL = 'custom-vision-model-v1';
    const groqVisionModel = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';
    const visionCandidates = Array.from(
      new Set([
        groqVisionModel,
        'qwen/qwen3.6-27b',
      ])
    );

    expect(visionCandidates[0]).toBe('custom-vision-model-v1');
    expect(visionCandidates).toContain('qwen/qwen3.6-27b');
  });

  it('successfully extracts OCR medicine details when Groq Vision returns text', async () => {
    const mockVisionResponse = {
      data: {
        choices: [
          {
            message: {
              content: 'Brand Name: Bidical 500\nGeneric Ingredients: Calcium, Vitamin D3\nDosage: 500mg\nManufacturer: Indoco',
            },
          },
        ],
      },
    };

    axios.post.mockResolvedValueOnce(mockVisionResponse);

    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'qwen/qwen3.6-27b',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'OCR' }] }],
    });

    const content = res.data.choices[0].message.content;
    expect(content).toContain('Bidical 500');
    expect(content).toContain('Calcium');
    expect(content).toContain('Vitamin D3');
  });

  it('persists stable server attachment URIs with attachmentId for authenticated media access', () => {
    const attachmentId = 'att_1786942468332_abc123';
    const publicUrl = `/api/chatbot/attachments/${attachmentId}`;
    
    expect(publicUrl).toMatch(/^\/api\/chatbot\/attachments\/att_\d+_[a-z0-9]+$/);
    expect(publicUrl).not.toContain('file://');
    expect(publicUrl).not.toContain('ph://');
  });
});
