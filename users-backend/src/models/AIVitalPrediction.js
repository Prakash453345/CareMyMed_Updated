const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    heart_rate: { type: Number, required: true },
    blood_pressure: {
      systolic: { type: Number, required: true },
      diastolic: { type: Number, required: true },
    },
    oxygen_saturation: { type: Number, required: true },
    hydration: { type: Number, required: true },
    temperature: { type: Number },
  },
  { _id: false }
);

const AIVitalPredictionSchema = new mongoose.Schema(
  {
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    health_label: {
      type: String,
      enum: ['Normal', 'Warning', 'Critical'],
      default: 'Normal',
    },
    status: {
      type: String,
      enum: ['building', 'ready', 'stale', 'unavailable'],
      default: 'building',
    },
    trend: {
      type: String,
      enum: ['improving', 'stable', 'worsening'],
      default: 'stable',
    },
    explanation: {
      type: String,
      default: null,
    },
    confidence_label: {
      type: String,
      enum: ['High', 'Moderate', 'Low'],
      default: 'Moderate',
    },
    consecutive_critical_days: {
      type: Number,
      default: 0,
    },
    confidence_score: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.85,
    },
    metadata: {
      model: { type: String, default: 'prophet' },
      version: { type: String, default: '1.2' },
      generatedBy: { type: String, default: 'forecast-service' },
      historyWindowDays: { type: Number, default: 14 },
      predictionWindowDays: { type: Number, default: 3 },
      trainingSamples: { type: Number, default: 0 },
    },
    predictions: [PredictionSchema],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('AIVitalPrediction', AIVitalPredictionSchema);
