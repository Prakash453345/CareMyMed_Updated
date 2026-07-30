const AIVitalPrediction = require('../models/AIVitalPrediction');

class ForecastRepository {
  /**
   * Get the latest forecast document for a patient.
   * @param {string} patientId
   * @returns {Promise<object|null>}
   */
  static async getLatestForecast(patientId) {
    return AIVitalPrediction.findOne({ patient_id: patientId }).lean();
  }

  /**
   * Upsert a completed forecast document.
   * @param {string} patientId
   * @param {object} forecastData
   * @returns {Promise<object>}
   */
  static async saveForecast(patientId, forecastData) {
    const filter = { patient_id: patientId };
    const update = {
      patient_id: patientId,
      status: forecastData.status || 'ready',
      health_label: forecastData.health_label || 'Normal',
      trend: forecastData.trend || 'stable',
      explanation: forecastData.explanation || null,
      confidence_label: forecastData.confidence_label || 'High',
      confidence_score: forecastData.confidence_score || 0.88,
      consecutive_critical_days: forecastData.consecutive_critical_days || 0,
      metadata: forecastData.metadata || {
        model: 'prophet',
        version: '1.2',
        generatedBy: 'forecast-service',
        historyWindowDays: 14,
        predictionWindowDays: 3,
        trainingSamples: forecastData.trainingSamples || 7,
      },
      predictions: forecastData.predictions || [],
      updated_at: new Date(),
    };

    return AIVitalPrediction.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }

  /**
   * Update building progress status for a patient with < 7 days of logs.
   * @param {string} patientId
   * @returns {Promise<object>}
   */
  static async saveBuildingStatus(patientId) {
    return AIVitalPrediction.findOneAndUpdate(
      { patient_id: patientId },
      {
        $set: {
          status: 'building',
          updated_at: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

module.exports = ForecastRepository;
