const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema(
  {
    attachmentId: { type: String, index: true },
    type: {
      type: String,
      enum: ['image', 'document', 'audio'],
      default: 'image',
    },
    url: { type: String },
    mimeType: { type: String },
    fileName: { type: String },
    storagePath: { type: String },
  },
  { _id: false }
);

const ChatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  text: {
    type: String,
  },
  image: {
    type: String,
  },
  attachments: [AttachmentSchema],
  audio: {
    type: String,
  },
  audioDuration: {
    type: Number,
  },
  cards: {
    type: Array,
    default: [],
  },
  suggestions: {
    type: [String],
    default: [],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const AIChatSessionSchema = new mongoose.Schema(
  {
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    title: {
      type: String,
      default: 'New Chat',
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_generating: {
      type: Boolean,
      default: false,
    },
    message_count: {
      type: Number,
      default: 1,
    },
    messages: [ChatMessageSchema],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

AIChatSessionSchema.index({ patient_id: 1, is_active: 1, updated_at: -1 });

module.exports = mongoose.model('AIChatSession', AIChatSessionSchema);
