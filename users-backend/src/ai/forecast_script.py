import sys
import json
import logging
import pandas as pd
import datetime

# Suppress cmdstanpy logging
logger = logging.getLogger('cmdstanpy')
logger.addHandler(logging.NullHandler())
logger.propagate = False
logger.setLevel(logging.CRITICAL)

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False


def train_and_predict(df: pd.DataFrame, column: str, horizon_days: int) -> list:
    if not PROPHET_AVAILABLE:
        # Simple linear trend extrapolation if Prophet is not installed
        last_val = df[column].iloc[-1]
        slope = (df[column].iloc[-1] - df[column].iloc[0]) / max(len(df) - 1, 1)
        return [round(last_val + slope * (i + 1), 1) for i in range(horizon_days)]

    df_prophet = df[['date', column]].rename(columns={'date': 'ds', column: 'y'})
    m = Prophet(
        daily_seasonality=False,
        weekly_seasonality=False,
        yearly_seasonality=False,
        changepoint_prior_scale=0.5
    )
    m.fit(df_prophet)
    future = m.make_future_dataframe(periods=horizon_days, freq='D', include_history=False)
    forecast = m.predict(future)
    return forecast['yhat'].tolist()


def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input:
            print(json.dumps({"error": "Empty input"}))
            sys.exit(1)

        payload = json.loads(raw_input)
        historical_data = payload.get("historical_data", [])
        horizon_days = payload.get("horizon_days", 3)

        if len(historical_data) < 7:
            print(json.dumps({"error": "Minimum 7 days required"}))
            sys.exit(1)

        records = []
        for h in historical_data:
            records.append({
                'date': pd.to_datetime(h['date']),
                'heart_rate': float(h.get('heart_rate', 70)),
                'systolic': float(h.get('blood_pressure', {}).get('systolic', 120)),
                'diastolic': float(h.get('blood_pressure', {}).get('diastolic', 80)),
                'oxygen_saturation': float(h.get('oxygen_saturation', 98)),
                'hydration': float(h.get('hydration', 50))
            })

        df = pd.DataFrame(records)
        df = df.set_index('date').resample('D').mean().ffill().reset_index()

        metrics = ['heart_rate', 'systolic', 'diastolic', 'oxygen_saturation', 'hydration']
        predictions = {m: train_and_predict(df, m, horizon_days) for m in metrics}

        last_date = df['date'].iloc[-1]
        predicted_records = []
        health_label = 'Normal'

        # Trend classification (compare first prediction to last historical)
        initial_sys = df['systolic'].iloc[-1]
        final_sys = predictions['systolic'][-1]
        diff_sys = final_sys - initial_sys

        if diff_sys > 4:
            trend = 'worsening'
        elif diff_sys < -4:
            trend = 'improving'
        else:
            trend = 'stable'

        for i in range(horizon_days):
            proj_date = last_date + pd.Timedelta(days=i + 1)
            hr = round(predictions['heart_rate'][i], 1)
            sys_val = round(predictions['systolic'][i], 1)
            dia_val = round(predictions['diastolic'][i], 1)
            spo2 = round(predictions['oxygen_saturation'][i], 1)
            hyd = round(predictions['hydration'][i], 1)

            if spo2 < 92 or sys_val > 160 or sys_val < 90 or hr > 120 or hr < 50:
                health_label = 'Critical'
            elif (spo2 < 95 and spo2 >= 92) or (sys_val > 140 and sys_val <= 160) or (hr > 100 and hr <= 120) or hyd < 40:
                if health_label != 'Critical':
                    health_label = 'Warning'

            spo2 = min(100.0, max(0.0, spo2))
            hyd = min(100.0, max(0.0, hyd))

            predicted_records.append({
                "date": proj_date.isoformat(),
                "heart_rate": hr,
                "blood_pressure": {"systolic": sys_val, "diastolic": dia_val},
                "oxygen_saturation": spo2,
                "hydration": hyd
            })

        output = {
            "health_label": health_label,
            "trend": trend,
            "predictions": predicted_records,
            "model": "prophet" if PROPHET_AVAILABLE else "wma_linear_fallback",
            "trainingSamples": len(df)
        }
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
