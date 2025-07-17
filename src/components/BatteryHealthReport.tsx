// BatteryHealthReport.tsx - Restored Original Implementation
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import BatteryHealthService from '../services/BatteryHealthService';
import BatteryDebugScreen from './BatteryDebugScreen';

interface HealthData {
  overallHealthScore: number;
  healthGrade: string;
  capacityDegradation: number;
  rangeDegradation: number;
  estimatedCycles: number;
  batteryLevel: number;
  estimatedRange: number;
  epaRange: number;
  totalMileage: number;
  chargingState: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  marketImpact: string;
}

interface BatteryHealthReportProps {
  route: {
    params: {
      vehicleId: string;
      vehicleName: string;
      vin: string;
    };
  };
  navigation: any;
}

const BatteryHealthReport: React.FC<BatteryHealthReportProps> = ({ route, navigation }) => {
  const { vehicleId, vehicleName, vin } = route.params;
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    fetchHealthAssessment();
  }, [vehicleId]);

  // Add Algorithm Comparison Navigation
  const navigateToAlgorithmComparison = () => {
    navigation.navigate('AlgorithmComparison', {
      vehicleId,
      vehicleName,
      vin
    });
  };

  const fetchHealthAssessment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔋 Starting battery health assessment...');
      const assessment = await BatteryHealthService.getBatteryHealthAssessment(vehicleId);
      
      setHealthData({
        overallHealthScore: assessment.overallHealthScore,
        healthGrade: assessment.healthGrade,
        capacityDegradation: assessment.capacityDegradation,
        rangeDegradation: assessment.rangeDegradation,
        estimatedCycles: assessment.estimatedCycles,
        batteryLevel: assessment.batteryLevel,
        estimatedRange: assessment.estimatedRange,
        epaRange: assessment.epaRange,
        totalMileage: assessment.totalMileage,
        chargingState: assessment.chargingState,
        strengths: assessment.strengths,
        concerns: assessment.concerns,
        recommendations: assessment.recommendations,
        marketImpact: assessment.marketImpact,
      });
      
      console.log('✅ Battery health assessment complete!');
      
    } catch (err) {
      console.error('❌ Health assessment failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Assessment failed';
      setError(errorMessage);
      
      Alert.alert(
        'Assessment Error',
        errorMessage,
        [
          { text: 'Retry', onPress: fetchHealthAssessment },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    if (!healthData) return;

    const reportText = `
Tesla Battery Health Report
Vehicle: ${vehicleName}
VIN: ${vin}
Generated: ${new Date().toLocaleDateString()}

OVERALL HEALTH SCORE: ${healthData.overallHealthScore}/100 (${healthData.healthGrade})

KEY METRICS:
• Capacity Degradation: ${healthData.capacityDegradation.toFixed(1)}%
• Range Degradation: ${healthData.rangeDegradation.toFixed(1)}%
• Estimated Charge Cycles: ${healthData.estimatedCycles}
• Current Battery Level: ${healthData.batteryLevel}%
• Current Range: ${healthData.estimatedRange} km
• Total Mileage: ${healthData.totalMileage.toLocaleString()} km

STRENGTHS:
${healthData.strengths.map(s => `• ${s}`).join('\n')}

CONCERNS:
${healthData.concerns.map(c => `• ${c}`).join('\n')}

RECOMMENDATIONS:
${healthData.recommendations.map(r => `• ${r}`).join('\n')}

MARKET IMPACT:
${healthData.marketImpact}

Note: This assessment is based on available vehicle data and industry standards.
For definitive battery health evaluation, consider professional inspection.
`;

    try {
      await Share.share({
        message: reportText,
        title: `${vehicleName} Battery Health Report`,
      });
    } catch (error) {
      console.error('Failed to share report:', error);
    }
  };

  const getHealthColor = (score: number): string => {
    if (score >= 90) return '#4CAF50';
    if (score >= 75) return '#8BC34A';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'Excellent': return '#4CAF50';
      case 'Good': return '#8BC34A';
      case 'Fair': return '#FF9800';
      case 'Poor': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Analyzing battery health...</Text>
      </View>
    );
  }

  if (error || !healthData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || 'Failed to load health data'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchHealthAssessment}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Battery Health Report</Text>
        <Text style={styles.subtitle}>{vehicleName}</Text>
        <Text style={styles.vin}>VIN: {vin}</Text>
        
        {/* Debug Icon */}
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={() => setShowDebug(true)}
        >
          <Text style={styles.debugIcon}>🔧</Text>
        </TouchableOpacity>
      </View>

      {/* Overall Health Score */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Overall Health Score</Text>
          <View style={[styles.scoreCircle, { borderColor: getHealthColor(healthData.overallHealthScore) }]}>
            <Text style={[styles.scoreText, { color: getHealthColor(healthData.overallHealthScore) }]}>
              {healthData.overallHealthScore}
            </Text>
            <Text style={styles.scoreUnit}>/ 100</Text>
          </View>
          <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(healthData.healthGrade) }]}>
            <Text style={styles.gradeText}>{healthData.healthGrade}</Text>
          </View>
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Key Battery Metrics</Text>
        
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{healthData.capacityDegradation.toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>Capacity Loss</Text>
            <View style={[styles.indicator, { 
              backgroundColor: healthData.capacityDegradation < 10 ? '#4CAF50' : 
                             healthData.capacityDegradation < 20 ? '#FF9800' : '#F44336' 
            }]} />
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{healthData.rangeDegradation.toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>Range Loss</Text>
            <View style={[styles.indicator, { 
              backgroundColor: healthData.rangeDegradation < 10 ? '#4CAF50' : 
                             healthData.rangeDegradation < 20 ? '#FF9800' : '#F44336' 
            }]} />
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{healthData.estimatedCycles}</Text>
            <Text style={styles.metricLabel}>Charge Cycles</Text>
            <View style={[styles.indicator, { 
              backgroundColor: healthData.estimatedCycles < 500 ? '#4CAF50' : 
                             healthData.estimatedCycles < 1000 ? '#FF9800' : '#F44336' 
            }]} />
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{healthData.batteryLevel}%</Text>
            <Text style={styles.metricLabel}>Current Level</Text>
            <View style={[styles.indicator, { 
              backgroundColor: healthData.batteryLevel > 20 ? '#4CAF50' : '#FF9800' 
            }]} />
          </View>
        </View>
      </View>

      {/* Current Status */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Range</Text>
            <Text style={styles.statusValue}>{healthData.estimatedRange} km</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>EPA Range</Text>
            <Text style={styles.statusValue}>{healthData.epaRange} km</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Mileage</Text>
            <Text style={styles.statusValue}>{healthData.totalMileage.toLocaleString()} km</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Charging</Text>
            <Text style={styles.statusValue}>{healthData.chargingState}</Text>
          </View>
        </View>
      </View>

      {/* Strengths */}
      {healthData.strengths.length > 0 && (
        <View style={styles.assessmentSection}>
          <Text style={styles.sectionTitle}>Strengths</Text>
          {healthData.strengths.map((strength, index) => (
            <View key={index} style={styles.assessmentItem}>
              <Text style={styles.strengthBullet}>✓</Text>
              <Text style={styles.assessmentText}>{strength}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Concerns */}
      {healthData.concerns.length > 0 && (
        <View style={styles.assessmentSection}>
          <Text style={styles.sectionTitle}>Concerns</Text>
          {healthData.concerns.map((concern, index) => (
            <View key={index} style={styles.assessmentItem}>
              <Text style={styles.concernBullet}>⚠</Text>
              <Text style={styles.assessmentText}>{concern}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      <View style={styles.assessmentSection}>
        <Text style={styles.sectionTitle}>Recommendations</Text>
        {healthData.recommendations.map((recommendation, index) => (
          <View key={index} style={styles.assessmentItem}>
            <Text style={styles.recommendationBullet}>→</Text>
            <Text style={styles.assessmentText}>{recommendation}</Text>
          </View>
        ))}
      </View>

      {/* Market Impact */}
      <View style={styles.marketSection}>
        <Text style={styles.sectionTitle}>Market Impact</Text>
        <Text style={styles.marketText}>{healthData.marketImpact}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.exportButton} onPress={exportReport}>
          <Text style={styles.exportButtonText}>Export Report</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.refreshButton} onPress={fetchHealthAssessment}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* NEW: Algorithm Comparison Button */}
      <View style={styles.comparisonSection}>
        <TouchableOpacity style={styles.comparisonButton} onPress={navigateToAlgorithmComparison}>
          <Text style={styles.comparisonButtonText}>🔬 Compare Algorithms</Text>
          <Text style={styles.comparisonButtonSubtext}>See how different methods analyze your battery</Text>
        </TouchableOpacity>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          This assessment is based on available vehicle data and industry standards. 
          For definitive battery health evaluation, consider professional inspection.
        </Text>
      </View>

      {/* Bottom spacing */}
      <View style={{ height: 30 }} />
      
      {/* Debug Screen Modal */}
      <BatteryDebugScreen
        visible={showDebug}
        onClose={() => setShowDebug(false)}
        vehicleId={vehicleId}
        vehicleName={vehicleName}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    position: 'relative',
  },
  debugButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  debugIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 2,
  },
  vin: {
    fontSize: 12,
    color: '#999999',
    fontFamily: 'monospace',
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '700',
  },
  scoreUnit: {
    fontSize: 14,
    color: '#666666',
  },
  gradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  gradeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  metricsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  indicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusSection: {
    margin: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  assessmentSection: {
    margin: 16,
  },
  assessmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  strengthBullet: {
    fontSize: 18,
    color: '#4CAF50',
    marginRight: 12,
    marginTop: 2,
  },
  concernBullet: {
    fontSize: 18,
    color: '#FF9800',
    marginRight: 12,
    marginTop: 2,
  },
  recommendationBullet: {
    fontSize: 18,
    color: '#2196F3',
    marginRight: 12,
    marginTop: 2,
  },
  assessmentText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  marketSection: {
    margin: 16,
  },
  marketText: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
  },
  exportButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // NEW: Algorithm Comparison Section
  comparisonSection: {
    margin: 16,
  },
  comparisonButton: {
    backgroundColor: '#9C27B0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  comparisonButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  comparisonButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
  },
  disclaimer: {
    backgroundColor: '#F0F4F8',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#546E7A',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

export default BatteryHealthReport;