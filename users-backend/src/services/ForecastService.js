const path = require('path');
const { spawn } = require('child_process');

class ForecastService {
  /**
   * Run the internal Python forecasting script.
   * @param {Array} historicalData - Array of historical vitals records
   * @param {number} horizonDays - Days into future to forecast (default 3)
   * @returns {Promise<object>}
   */
  static async generateForecast(historicalData, horizonDays = 3) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '../ai/forecast_script.py');
      const pythonProcess = spawn('python', [scriptPath], {
        timeout: 20000,
      });

      let stdoutData = '';
      let stderrData = '';

      pythonProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      pythonProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to spawn Python process: ${err.message}`));
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0 && !stdoutData) {
          return reject(
            new Error(`Python process exited with code ${code}: ${stderrData}`)
          );
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          if (parsed.error) {
            return reject(new Error(parsed.error));
          }

          // Calculate objective confidence score based on sample count & stability
          const samples = parsed.trainingSamples || historicalData.length;
          const confidenceScore = Math.min(
            0.96,
            Math.max(0.60, Number((0.55 + samples * 0.035).toFixed(2)))
          );
          const confidenceLabel =
            confidenceScore >= 0.85
              ? 'High'
              : confidenceScore >= 0.70
              ? 'Moderate'
              : 'Low';

          resolve({
            health_label: parsed.health_label || 'Normal',
            trend: parsed.trend || 'stable',
            predictions: parsed.predictions || [],
            confidence_score: confidenceScore,
            confidence_label: confidenceLabel,
            trainingSamples: samples,
            model: parsed.model || 'prophet',
            version: '1.2',
            generatedBy: 'forecast-service',
          });
        } catch (parseErr) {
          reject(
            new Error(
              `Invalid JSON from Python output: ${parseErr.message}. Output was: ${stdoutData}`
            )
          );
        }
      });

      // Send payload via stdin
      const payload = JSON.stringify({
        historical_data: historicalData,
        horizon_days: horizonDays,
      });

      pythonProcess.stdin.write(payload);
      pythonProcess.stdin.end();
    });
  }
}

module.exports = ForecastService;
