import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function AIPredictionChart({ vitalsHistory, predictionData, metricName, unit, forecastStatus, progress, confidence, explanation, metadata }) {
  const [chartWidth, setChartWidth] = useState(screenWidth - 100);
  const safeHistory = vitalsHistory || [];

  // Render "Building AI Forecast" progress card when status is 'building' or < 7 days logged
  if (forecastStatus === 'building' || (progress && progress.loggedDays < progress.requiredDays)) {
    const logged = progress?.loggedDays || 0;
    const req = progress?.requiredDays || 7;
    const remaining = Math.max(0, req - logged);
    const progressPercent = Math.min(100, Math.round((logged / req) * 100));

    return (
      <View style={styles.container}>
        <Text style={styles.title}>AI Vitals Outlook</Text>
        <View style={styles.progressCardContainer}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressIcon}>🤖</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>Building AI Forecast</Text>
              <Text style={styles.progressSub}>{logged} of {req} days recorded</Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeTxt}>{progressPercent}%</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.progressCtaText}>
            Log vitals for <Text style={{ fontWeight: '800', color: '#6366F1' }}>{remaining} more days</Text> to unlock personalized trend forecasting.
          </Text>
        </View>
      </View>
    );
  }

  // chart-kit crashes if all values are perfectly identical and 0
  const validValues = allValues.length ? allValues : [0];

  // Max 5 labels to prevent overlap
  const labelInterval = Math.max(1, Math.ceil(labels.length / 5));

  const data = {
    labels: labels.map((l, i) => (i % labelInterval === 0 ? l : '')), 
    datasets: [
      {
        data: allValues.map(Number),
        color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`, // Light blue connecting line
        strokeWidth: 2
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(226, 232, 240, ${opacity})`, // grid line color
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`, // text label color
    strokeWidth: 2, 
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#FFF'
    },
    getDotColor: (dataPoint, index) => {
      // Connect line is solid, but dots change color for predictions
      return index >= safeHistory.length ? (isBackendAI ? '#F59E0B' : '#A78BFA') : '#0EA5E9';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{metricName} Outlook</Text>
      
      {/* Honesty subtitle */}
      <Text style={styles.honestyLabel}>
        {isBackendAI 
          ? 'Powered by AI analysis of your vitals history'
          : 'Estimated trend based on recent readings'
        }
      </Text>
      
      {/* Custom Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#0EA5E9' }]} />
          <Text style={styles.legendText}>History</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[
            styles.legendDot, 
            isBackendAI 
              ? { backgroundColor: '#F59E0B' } 
              : { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#A78BFA', borderStyle: 'dashed' }
          ]} />
          <Text style={styles.legendText}>{isBackendAI ? 'AI Forecast' : 'Estimated Trend'}</Text>
        </View>
      </View>

      <View style={styles.chartWrapper} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 16)}>
        <LineChart
          data={data}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          bezier={false} 
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          fromZero={true}
          formatYLabel={(y) => Math.round(Number(y)).toString()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  progressCardContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  progressIcon: {
    fontSize: 26,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  progressSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  progressBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  progressBadgeTxt: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  progressCtaText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  honestyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  chartWrapper: {
    alignItems: 'center',
    marginVertical: 4,
    overflow: 'hidden',
    width: '100%',
    borderRadius: 12,
  },
  chart: {
    borderRadius: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  }
});
