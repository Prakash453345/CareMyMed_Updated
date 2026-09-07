const VitalLog = require('../models/VitalLog');
const Notification = require('../models/Notification');
const Patient = require('../models/Patient');
const Caller = require('../models/Caller');
const PushNotificationService = require('../utils/pushNotifications');
const ForecastRepository = require('../repositories/ForecastRepository');
const ForecastService = require('./ForecastService');

const pendingDebounceMap = new Map();

class AIPredictionService {
  /**
   * Queue a background forecast job with a 5-second debounce.
   * Prevents multiple back-to-back vital logs from running redundant predictions.
   * @param {string} patientId
   */
  static queuePatientForecast(patientId) {
    if (!patientId) return;
    const pidStr = patientId.toString();
    if (pendingDebounceMap.has(pidStr)) {
      clearTimeout(pendingDebounceMap.get(pidStr));
    }

    const timer = setTimeout(() => {
      pendingDebounceMap.delete(pidStr);
      this.processPatientPrediction(patientId).catch((err) => {
        console.warn(
          `[AIPredictionService] Background forecast execution failed for patient ${patientId}:`,
          err.message
        );
      });
    }, 5000); // 5s debounce

    pendingDebounceMap.set(pidStr, timer);
  }

  /**
   * Fetch historical vitals, query internal ForecastService, synthesize explanation once, and save.
   * @param {string} patientId
   */
  static async processPatientPrediction(patientId) {
    try {
      const date14DaysAgo = new Date();
      date14DaysAgo.setDate(date14DaysAgo.getDate() - 14);

      const vitals = await VitalLog.find({
        patient_id: patientId,
        date: { $gte: date14DaysAgo },
      })
        .sort({ date: 1 })
        .lean();

      // Determine distinct days count
      const distinctDays = new Set(
        vitals.map((v) => new Date(v.date).toISOString().slice(0, 10))
      ).size;

      // If < 7 days of logs, save progress status 'building'
      if (distinctDays < 7) {
        await ForecastRepository.saveBuildingStatus(patientId);
        return {
          success: false,
          status: 'building',
          loggedDays: distinctDays,
          requiredDays: 7,
          message: 'Fewer than 7 distinct days recorded',
        };
      }

      // Format payload for ForecastService
      const historicalData = vitals.map((v) => ({
        date: new Date(v.date).toISOString(),
        heart_rate: v.heart_rate,
        blood_pressure: {
          systolic: v.blood_pressure.systolic,
          diastolic: v.blood_pressure.diastolic,
        },
        oxygen_saturation: v.oxygen_saturation,
        hydration: v.hydration,
      }));

      // Generate forecast via internal ForecastService
      const forecastResult = await ForecastService.generateForecast(
        historicalData,
        3
      );

      // Synthesize clinical explanation ONCE upon prediction creation
      const explanation = this.generateClinicalExplanation(
        forecastResult.trend,
        forecastResult.predictions,
        forecastResult.health_label
      );

      // Existing doc check for streak
      const existingDoc = await ForecastRepository.getLatestForecast(patientId);
      const currentStreak = this.calculateStreak(
        existingDoc,
        forecastResult.health_label
      );

      // Save complete forecast document with rich metadata
      const savedDoc = await ForecastRepository.saveForecast(patientId, {
        status: 'ready',
        health_label: forecastResult.health_label,
        trend: forecastResult.trend,
        explanation,
        confidence_label: forecastResult.confidence_label,
        confidence_score: forecastResult.confidence_score,
        consecutive_critical_days: currentStreak,
        predictions: forecastResult.predictions,
        trainingSamples: distinctDays,
        metadata: {
          model: forecastResult.model || 'prophet',
          version: forecastResult.version || '1.2',
          generatedBy: 'forecast-service',
          historyWindowDays: 14,
          predictionWindowDays: 3,
          trainingSamples: distinctDays,
        },
      });

      // Push notification evaluation for Critical trends
      const shouldNotify = this.shouldSendAlert(
        currentStreak,
        forecastResult.health_label
      );
      if (shouldNotify) {
        await this.triggerCriticalPushAlert(patientId, savedDoc);
      }

      return {
        success: true,
        status: 'ready',
        health_label: forecastResult.health_label,
        trend: forecastResult.trend,
        currentStreak,
        notified: shouldNotify,
      };
    } catch (error) {
      console.error(
        `AI Prediction Error for Patient ${patientId}:`,
        error.message
      );
      return { success: false, status: 'unavailable', error: error.message };
    }
  }

  /**
   * Deterministic + LLM clinical explanation generator.
   */
  static generateClinicalExplanation(trend, predictions, healthLabel) {
    const latestSys =
      predictions?.[predictions.length - 1]?.blood_pressure?.systolic || 120;
    const latestHr = predictions?.[predictions.length - 1]?.heart_rate || 72;

    if (healthLabel === 'Critical') {
      return `CLINICAL ALERT: Projected vital signs indicate potential critical levels (Systolic BP ~${latestSys} mmHg, HR ~${latestHr} bpm). Please consult your healthcare provider or caregiver immediately.`;
    }
    if (trend === 'worsening') {
      return `Your projected systolic blood pressure is trending slightly upward (~${latestSys} mmHg). Consider reviewing hydration, sodium intake, and recent stress levels.`;
    }
    if (trend === 'improving') {
      return `Your vital signs show positive improvement over the next 3 days. Continue adhering to your prescribed medication schedule and daily wellness routine.`;
    }
    return `Your projected vitals are stable over the next 3 days with consistent blood pressure (~${latestSys} mmHg) and heart rate (~${latestHr} bpm).`;
  }

  /**
   * Calculate consecutive critical days streak.
   */
  static calculateStreak(existingDoc, newLabel) {
    const previousStreak = existingDoc?.consecutive_critical_days || 0;
    if (existingDoc && existingDoc.updated_at) {
      const lastUpdateDate = new Date(existingDoc.updated_at)
        .toISOString()
        .slice(0, 10);
      const todayDate = new Date().toISOString().slice(0, 10);
      if (lastUpdateDate === todayDate) {
        return previousStreak;
      }
    }
    if (newLabel === 'Critical') {
      return previousStreak + 1;
    }
    return 0;
  }

  /**
   * Alert matrix check.
   */
  static shouldSendAlert(streak, healthLabel) {
    if (healthLabel !== 'Critical') return false;
    if (streak < 1) return false;
    if (streak === 2) return true;
    if (streak === 4) return true;
    if (streak > 4 && (streak - 4) % 3 === 0) return true;
    return false;
  }

  /**
   * Trigger critical push alert.
   */
  static async triggerCriticalPushAlert(patientId, predictionDoc) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient) return;

      const alertMessage = `Your predicted vitals are trending towards critical levels. Please review your health dashboard.`;

      await Notification.create({
        patient_id: patient._id,
        title: '⚠️ Critical Vital Trend Detected',
        message: alertMessage,
        type: 'alert',
        target_screen: 'VitalsScreen',
        expo_push_token: patient.expo_push_token || undefined,
      });

      await PushNotificationService.sendCriticalVitalAlert(
        patient,
        predictionDoc
      );

      if (patient.assigned_caller_id) {
        try {
          const caller = await Caller.findById(patient.assigned_caller_id);
          if (caller) {
            await PushNotificationService.sendCallerCriticalAlert(
              caller,
              patient,
              predictionDoc
            );
          }
        } catch (callerErr) {
          console.warn('⚠️ Could not notify caller:', callerErr.message);
        }
      }
    } catch (error) {
      console.error('❌ Error triggering critical push alert:', error.message);
    }
  }
}

module.exports = AIPredictionService;
