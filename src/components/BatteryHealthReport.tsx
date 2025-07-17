import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import batteryHealthService from '../services/BatteryHealthService';
import type { BatteryHealthData } from '../services/BatteryHealthService';
import BatteryDebugScreen from './BatteryDebugScreen';

interface BatteryHealthReportParams {
  vehicleId: string;
  vehicleName: string;
  vin: string;
}

const BatteryHealthReport: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, BatteryHealthReportParams>, string>>();
  const { vehicleId, vehicleName, vin } = route.params;
  const [healthData, setHealthData] = useState<BatteryHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const fetchHealthAssessment = async () => {
    try {
      setLoading(true);
      const data = await batteryHealthService.getBatteryHealthAssessment(vehicleId);
      setHealthData(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch battery health data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAssessment();
  }, [vehicleId]);

  const getHealthColor = (score: number): string => {
    if (score >= 90) return '#4CAF50'; // Green
    if (score >= 75) return '#8BC34A'; // Light Green  
    if (score >= 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'Excellent': return '#4CAF50';
      case 'Good': return '#8BC34A';
      case 'Fair': return '#FF9800';
      case 'Poor': return '#F44336';
      default: return '#666666';
    }
  };

  const exportReport = async () => {
    if (!healthData) return;

    const report = `
TESLA BATTERY HEALTH REPORT
${vehicleName} (${vin})
Generated: ${new Date().toLocaleDateString()}

OVERALL HEALTH: ${healthData.overallHealthScore}/100 (${healthData.healthGrade})

BATTERY CONDITION:
• Current Capacity: ${healthData.usableCapacity.toFixed(1)} kWh
• Capacity Degradation: ${healthData.capacityDegradation.toFixed(1)}%
• Range Degradation: ${healthData.rangeDegradation.toFixed(1)}%
• Estimated Range: ${healthData.estimatedRange} km

USAGE METRICS:
• Total Mileage: ${healthData.totalMileage.toLocaleString()} km
• Estimated Charge Cycles: ${healthData.estimatedCycles}
• Cycles per Mile: ${healthData.cyclesPerMile.toFixed(4)}

MARKET IMPACT:
• Estimated Value Impact: ${healthData.marketImpact.estimatedValueImpact}%
• Warranty Status: ${healthData.marketImpact.warrantyStatus}
• Expected Life: ${healthData.marketImpact.expectedLifeRemaining}

STRENGTHS:
${healthData.strengths.map(s => `• ${s}`).join('\n')}

CONCERNS:
${healthData.concerns.map(c => `• ${c}`).join('\n')}

RECOMMENDATIONS:
${healthData.recommendations.map(r => `• ${r}`).join('\n')}
    `;

    try {
      await Share.share({
        message: report,
        title: 'Tesla Battery Health Report',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Analyzing battery health...</Text>
      </View>
    );
  }

  if (!healthData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load battery health data</Text>
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
            <Text style={styles.metricValue}>{Math.round(healthData.usableCapacity)}</Text>
            <Text style={styles.metricLabel}>Usable kWh</Text>
            <View style={[styles.indicator, { backgroundColor: '#2196F3' }]} />
          </View>
        </View>
      </View>

      {/* Battery Details */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Battery Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Range</Text>
          <Text style={styles.detailValue}>{healthData.estimatedRange} km</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Original EPA Range</Text>
          <Text style={styles.detailValue}>{healthData.epaRange} km</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Capacity</Text>
          <Text style={styles.detailValue}>{healthData.usableCapacity.toFixed(1)} kWh</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Original Capacity</Text>
          <Text style={styles.detailValue}>{healthData.nominalCapacity.toFixed(1)} kWh</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Mileage</Text>
          <Text style={styles.detailValue}>{healthData.totalMileage.toLocaleString()} km</Text>
        </View>
      </View>

      {/* Market Impact */}
      <View style={styles.marketSection}>
        <Text style={styles.sectionTitle}>Market Impact Assessment</Text>
        
        <View style={styles.marketCard}>
          <View style={styles.marketRow}>
            <Text style={styles.marketLabel}>Estimated Value Impact</Text>
            <Text style={[styles.marketValue, { color: '#F44336' }]}>
              -{healthData.marketImpact.estimatedValueImpact}%
            </Text>
          </View>
          
          <View style={styles.marketRow}>
            <Text style={styles.marketLabel}>Warranty Status</Text>
            <Text style={styles.marketValue}>{healthData.marketImpact.warrantyStatus}</Text>
          </View>
          
          <View style={styles.marketRow}>
            <Text style={styles.marketLabel}>Expected Remaining Life</Text>
            <Text style={styles.marketValue}>{healthData.marketImpact.expectedLifeRemaining}</Text>
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

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.exportButton} onPress={exportReport}>
          <Text style={styles.exportButtonText}>Export Report</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.refreshButton} onPress={fetchHealthAssessment}>
          <Text style={styles.refreshButtonText}>Refresh Assessment</Text>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 4,
  },
  vin: {
    fontSize: 14,
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
    elevation: 5,
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
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '700',
  },
  scoreUnit: {
    fontSize: 16,
    color: '#666666',
    marginTop: -4,
  },
  gradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  gradeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  metricsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
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
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  indicator: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  marketSection: {
    margin: 16,
  },
  marketCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  marketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  marketLabel: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
  },
  marketValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
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