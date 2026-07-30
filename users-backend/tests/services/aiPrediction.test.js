/**
 * Tests for AIPredictionService
 * Covers: streak logic, alert frequency, ForecastService integration, push notifications
 */

const mongoose = require('mongoose');

jest.mock('../../src/models/VitalLog');
jest.mock('../../src/models/AIVitalPrediction');
jest.mock('../../src/models/Notification');
jest.mock('../../src/models/Patient');
jest.mock('../../src/models/Caller');
jest.mock('../../src/utils/pushNotifications');
jest.mock('../../src/services/ForecastService');
jest.mock('../../src/repositories/ForecastRepository');

const AIPredictionService = require('../../src/services/aiPredictionService');
const VitalLog = require('../../src/models/VitalLog');
const AIVitalPrediction = require('../../src/models/AIVitalPrediction');
const Notification = require('../../src/models/Notification');
const Patient = require('../../src/models/Patient');
const Caller = require('../../src/models/Caller');
const PushNotificationService = require('../../src/utils/pushNotifications');
const ForecastService = require('../../src/services/ForecastService');
const ForecastRepository = require('../../src/repositories/ForecastRepository');

function makeVitalDocs(count) {
  const docs = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (count - 1 - i));
    docs.push({
      date,
      heart_rate: 72,
      blood_pressure: { systolic: 120, diastolic: 80 },
      oxygen_saturation: 98,
      hydration: 55,
    });
  }
  return docs;
}

function makeMockPredictionDoc(overrides = {}) {
  return {
    patient_id: new mongoose.Types.ObjectId(),
    health_label: 'Normal',
    consecutive_critical_days: 0,
    predictions: [],
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('AIPredictionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateStreak', () => {
    it('should increment streak when label is Critical', () => {
      const doc = makeMockPredictionDoc({ consecutive_critical_days: 3 });
      expect(AIPredictionService.calculateStreak(doc, 'Critical')).toBe(4);
    });

    it('should reset streak to 0 when label is Normal', () => {
      const doc = makeMockPredictionDoc({ consecutive_critical_days: 5 });
      expect(AIPredictionService.calculateStreak(doc, 'Normal')).toBe(0);
    });

    it('should reset streak to 0 when label is Warning', () => {
      const doc = makeMockPredictionDoc({ consecutive_critical_days: 2 });
      expect(AIPredictionService.calculateStreak(doc, 'Warning')).toBe(0);
    });

    it('should start streak at 1 for first Critical day', () => {
      const doc = makeMockPredictionDoc({ consecutive_critical_days: 0 });
      expect(AIPredictionService.calculateStreak(doc, 'Critical')).toBe(1);
    });

    it('should NOT increment streak if prediction was already run today (idempotency)', () => {
      const doc = makeMockPredictionDoc({
        consecutive_critical_days: 3,
        updated_at: new Date(),
      });
      expect(AIPredictionService.calculateStreak(doc, 'Critical')).toBe(3);
    });

    it('should handle null/undefined existing doc gracefully', () => {
      expect(AIPredictionService.calculateStreak(null, 'Critical')).toBe(1);
      expect(AIPredictionService.calculateStreak(undefined, 'Critical')).toBe(1);
    });
  });

  describe('shouldSendAlert', () => {
    it('should NOT alert on Day 1 Critical (streak=1)', () => {
      expect(AIPredictionService.shouldSendAlert(1, 'Critical')).toBe(false);
    });

    it('should alert on Day 2 Critical (streak=2)', () => {
      expect(AIPredictionService.shouldSendAlert(2, 'Critical')).toBe(true);
    });

    it('should NOT alert on Day 3 Critical (streak=3)', () => {
      expect(AIPredictionService.shouldSendAlert(3, 'Critical')).toBe(false);
    });

    it('should alert on Day 4 Critical (streak=4)', () => {
      expect(AIPredictionService.shouldSendAlert(4, 'Critical')).toBe(true);
    });

    it('should NOT alert on Day 5 Critical (streak=5)', () => {
      expect(AIPredictionService.shouldSendAlert(5, 'Critical')).toBe(false);
    });

    it('should alert on Day 7 Critical (streak=7)', () => {
      expect(AIPredictionService.shouldSendAlert(7, 'Critical')).toBe(true);
    });

    it('should NOT alert on any Normal label regardless of streak', () => {
      expect(AIPredictionService.shouldSendAlert(2, 'Normal')).toBe(false);
      expect(AIPredictionService.shouldSendAlert(7, 'Normal')).toBe(false);
    });

    it('should NOT alert on Warning label', () => {
      expect(AIPredictionService.shouldSendAlert(2, 'Warning')).toBe(false);
    });
  });

  describe('processPatientPrediction', () => {
    const patientId = new mongoose.Types.ObjectId();

    it('should return building status when fewer than 7 vitals exist', async () => {
      VitalLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(makeVitalDocs(5)),
        }),
      });

      const result = await AIPredictionService.processPatientPrediction(patientId);

      expect(result.success).toBe(false);
      expect(result.status).toBe('building');
      expect(ForecastRepository.saveBuildingStatus).toHaveBeenCalledWith(patientId);
      expect(ForecastService.generateForecast).not.toHaveBeenCalled();
    });

    it('should call ForecastService and save prediction for valid data', async () => {
      VitalLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(makeVitalDocs(8)),
        }),
      });

      ForecastService.generateForecast.mockResolvedValue({
        health_label: 'Normal',
        trend: 'stable',
        predictions: [
          {
            date: '2024-01-09',
            heart_rate: 72,
            blood_pressure: { systolic: 120, diastolic: 80 },
            oxygen_saturation: 98,
            hydration: 55,
          },
        ],
        confidence_score: 0.88,
        confidence_label: 'High',
        model: 'prophet',
        version: '1.2',
      });

      ForecastRepository.getLatestForecast.mockResolvedValue(null);
      ForecastRepository.saveForecast.mockResolvedValue({
        patient_id: patientId,
        status: 'ready',
        health_label: 'Normal',
      });

      const result = await AIPredictionService.processPatientPrediction(patientId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('ready');
      expect(result.health_label).toBe('Normal');
      expect(ForecastService.generateForecast).toHaveBeenCalled();
      expect(ForecastRepository.saveForecast).toHaveBeenCalled();
    });

    it('should trigger notification on Day 2 Critical', async () => {
      VitalLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(makeVitalDocs(8)),
        }),
      });

      ForecastService.generateForecast.mockResolvedValue({
        health_label: 'Critical',
        trend: 'worsening',
        predictions: [
          {
            date: '2024-01-09',
            heart_rate: 130,
            blood_pressure: { systolic: 170, diastolic: 100 },
            oxygen_saturation: 90,
            hydration: 30,
          },
        ],
        confidence_score: 0.9,
        confidence_label: 'High',
      });

      const mockDoc = makeMockPredictionDoc({
        consecutive_critical_days: 1,
        health_label: 'Critical',
      });
      ForecastRepository.getLatestForecast.mockResolvedValue(mockDoc);

      const mockPatient = {
        _id: patientId,
        name: 'Test Patient',
        expo_push_token: 'ExponentPushToken[test]',
        push_notifications_enabled: true,
        assigned_caller_id: null,
      };
      Patient.findById.mockResolvedValue(mockPatient);
      Notification.create.mockResolvedValue({});
      PushNotificationService.sendCriticalVitalAlert.mockResolvedValue({
        success: true,
      });

      const result = await AIPredictionService.processPatientPrediction(patientId);

      expect(result.success).toBe(true);
      expect(result.currentStreak).toBe(2);
      expect(result.notified).toBe(true);
      expect(Notification.create).toHaveBeenCalled();
      expect(PushNotificationService.sendCriticalVitalAlert).toHaveBeenCalled();
    });

    it('should handle ForecastService error gracefully', async () => {
      VitalLog.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(makeVitalDocs(8)),
        }),
      });

      ForecastService.generateForecast.mockRejectedValue(
        new Error('Python execution error')
      );

      const result = await AIPredictionService.processPatientPrediction(patientId);

      expect(result.success).toBe(false);
      expect(result.status).toBe('unavailable');
      expect(result.error).toContain('Python execution error');
    });
  });
});
