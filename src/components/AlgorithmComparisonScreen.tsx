// AlgorithmComparisonScreen.tsx - Complete Implementation
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import BatteryHealthService from '../services/BatteryHealthService';
import TeslaMateAlgorithmService from '../services/TeslaMateAlgorithmService';
import VehicleWakeService from '../services/VehicleWakeService';

interface ComparisonData {
  current: any;
  teslaMate: any;
  differences: any;
}

interface AlgorithmComparisonScreenProps {
  route?: {
    params: {
      vehicleId: string;
      vehicleName: string;
      vin?: string;
    };
  };
  navigation?: any;
  // Direct props for when called as a component (fallback)
  vehicleId?: string;
  vehicleName?: string;
  vin?: string;
}

const AlgorithmComparisonScreen: React.FC<AlgorithmComparisonScreenProps> = ({ 
  route, 
  navigation, 
  vehicleId: directVehicleId, 
  vehicleName: directVehicleName, 
  vin: directVin 
}) => {
  // Handle both navigation props and direct props
  const vehicleId = route?.params?.vehicleId || directVehicleId;
  const vehicleName = route?.params?.vehicleName || directVehicleName;
  const vin = route?.params?.vin || directVin;

  // Ensure we have the required data
  if (!vehicleId || !vehicleName) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Missing vehicle information</Text>
      </View>
    );
  }
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'detailed' | 'raw'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [isOfflineComparison, setIsOfflineComparison] = useState(false);

  useEffect(() => {
    checkVehicleAndRun();
  }, [vehicleId]);

  const checkVehicleAndRun = async () => {
    try {
      setLoading(true);
      console.log('🔬 Starting algorithm comparison...');

      // Try real comparison first with the actual TeslaMate service
      await runComparison();
      
    } catch (error) {
      console.error('Failed to run comparison:', error);
      setError('Failed to start comparison');
      setLoading(false);
    }
  };

  const runOfflineDemo = async () => {
    setLoading(true);
    setError(null);
    setIsOfflineComparison(true);
    
    try {
      console.log('🎭 Running demo comparison...');
      
      // Generate mock current algorithm results
      const mockCurrentResults = {
        overallHealthScore: 86,
        capacityDegradation: 8.2,
        rangeDegradation: 19.2,
        estimatedCycles: 74,
        batteryLevel: 78,
        estimatedRange: 402,
        epaRange: 515,
        totalMileage: 32750,
        debugInfo: {
          calculationMethod: 'Current Algorithm (Demo)',
          note: 'Mock data for demonstration'
        }
      };
      
      // Generate mock TeslaMate results (typically these would come from TeslaMateAlgorithmService)
      const mockTeslaMateResults = {
        batteryHealthPercent: 82,
        capacityDegradation: 12.1,
        rangeDegradation: 15.8,
        estimatedCycles: 89,
        methodology: 'Historical Database Analysis',
        debugInfo: {
          calculationMethod: 'TeslaMate Algorithm (Demo)',
          note: 'Mock TeslaMate data for demonstration'
        }
      };
      
      const differences = calculateDifferences(mockCurrentResults, mockTeslaMateResults);
      
      setComparisonData({
        current: mockCurrentResults,
        teslaMate: mockTeslaMateResults,
        differences
      });
      
      console.log('✅ Demo comparison complete!');
      
    } catch (error) {
      console.error('❌ Demo comparison failed:', error);
      setError('Failed to run demo comparison');
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    setLoading(true);
    setError(null);
    setIsOfflineComparison(false);
    
    try {
      console.log('🔬 Starting real algorithm comparison...');
      
      // Get results from both algorithms
      const [currentResults, teslaMateResults] = await Promise.all([
        BatteryHealthService.getBatteryHealthAssessment(vehicleId),
        TeslaMateAlgorithmService.getBatteryHealthComparison(vehicleId)
      ]);

      // Check if TeslaMate returned offline results
      if (teslaMateResults.isOfflineComparison) {
        console.log('⚠️ TeslaMate returned offline results, falling back to demo mode');
        await runOfflineDemo();
        return;
      }

      // Calculate differences using real data
      const differences = calculateDifferences(currentResults, teslaMateResults.teslaMateResults);
      
      setComparisonData({
        current: currentResults,
        teslaMate: teslaMateResults.teslaMateResults,
        differences
      });
      
      console.log('✅ Real algorithm comparison complete!');
      console.log('📊 Current Results:', currentResults);
      console.log('📊 TeslaMate Results:', teslaMateResults.teslaMateResults);
      
    } catch (err) {
      console.error('❌ Comparison failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Comparison failed';
      
      if (errorMessage.includes('vehicle unavailable') || errorMessage.includes('408')) {
        console.log('🚗 Vehicle offline, falling back to demo mode');
        setIsOfflineComparison(true);
        await runOfflineDemo();
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateDifferences = (current: any, teslaMate: any) => {
    const currentHealth = current.overallHealthScore || 0;
    const teslaMateHealth = teslaMate.batteryHealthPercent || 0;
    
    const currentCapacityDeg = current.capacityDegradation || 0;
    const teslaMateCapacityDeg = teslaMate.capacityDegradation || 0;
    
    const currentRangeDeg = current.rangeDegradation || 0;
    const teslaMateRangeDeg = teslaMate.rangeDegradation || 0;

    return {
      healthScore: {
        current: currentHealth,
        teslaMate: teslaMateHealth,
        difference: teslaMateHealth - currentHealth,
        percentChange: currentHealth > 0 ? ((teslaMateHealth - currentHealth) / currentHealth) * 100 : 0
      },
      capacityDegradation: {
        current: currentCapacityDeg,
        teslaMate: teslaMateCapacityDeg,
        difference: teslaMateCapacityDeg - currentCapacityDeg,
        percentChange: currentCapacityDeg > 0 ? ((teslaMateCapacityDeg - currentCapacityDeg) / currentCapacityDeg) * 100 : 0
      },
      rangeDegradation: {
        current: currentRangeDeg,
        teslaMate: teslaMateRangeDeg,
        difference: teslaMateRangeDeg - currentRangeDeg,
        percentChange: currentRangeDeg > 0 ? ((teslaMateRangeDeg - currentRangeDeg) / currentRangeDeg) * 100 : 0
      }
    };
  };

  const renderTabButton = (tab: 'overview' | 'detailed' | 'raw', title: string) => (
    <TouchableOpacity
      style={[styles.tabButton, selectedTab === tab && styles.activeTab]}
      onPress={() => setSelectedTab(tab)}
    >
      <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const formatDifference = (diff: number, isPercentage: boolean = false) => {
    const sign = diff > 0 ? '+' : '';
    const suffix = isPercentage ? '%' : '';
    return `${sign}${diff.toFixed(1)}${suffix}`;
  };

  const getDifferenceColor = (diff: number, inverse: boolean = false) => {
    if (Math.abs(diff) < 0.1) return '#666666'; // Neutral for minimal difference
    const isPositive = diff > 0;
    if (inverse) {
      return isPositive ? '#F44336' : '#4CAF50'; // For degradation, higher is worse
    }
    return isPositive ? '#4CAF50' : '#F44336'; // For health score, higher is better
  };

  const renderOverviewTab = () => {
    if (!comparisonData) return null;

    return (
      <ScrollView style={styles.tabContent}>
        {/* Header */}
        <View style={styles.comparisonHeader}>
          <Text style={styles.comparisonTitle}>Algorithm Comparison</Text>
          <Text style={styles.comparisonSubtitle}>
            {isOfflineComparison ? 'Demo Mode' : 'Live Data'} • {vehicleName}
          </Text>
        </View>

        {/* Health Score Comparison */}
        <View style={styles.comparisonCard}>
          <Text style={styles.cardTitle}>Overall Health Score</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.algorithmColumn}>
              <Text style={styles.algorithmName}>Current Algorithm</Text>
              <Text style={styles.algorithmValue}>
                {comparisonData.current.overallHealthScore || 0}/100
              </Text>
            </View>
            <View style={styles.differenceColumn}>
              <Text style={[
                styles.differenceText,
                { color: getDifferenceColor(comparisonData.differences.healthScore.difference) }
              ]}>
                {formatDifference(comparisonData.differences.healthScore.difference)}
              </Text>
            </View>
            <View style={styles.algorithmColumn}>
              <Text style={styles.algorithmName}>TeslaMate Algorithm</Text>
              <Text style={styles.algorithmValue}>
                {comparisonData.teslaMate.batteryHealthPercent || 0}/100
              </Text>
            </View>
          </View>
        </View>

        {/* Capacity Degradation Comparison */}
        <View style={styles.comparisonCard}>
          <Text style={styles.cardTitle}>Capacity Degradation</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.algorithmColumn}>
              <Text style={styles.algorithmName}>Current Algorithm</Text>
              <Text style={styles.algorithmValue}>
                {(comparisonData.current.capacityDegradation || 0).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.differenceColumn}>
              <Text style={[
                styles.differenceText,
                { color: getDifferenceColor(comparisonData.differences.capacityDegradation.difference, true) }
              ]}>
                {formatDifference(comparisonData.differences.capacityDegradation.difference, true)}
              </Text>
            </View>
            <View style={styles.algorithmColumn}>
              <Text style={styles.algorithmName}>TeslaMate Algorithm</Text>
              <Text style={styles.algorithmValue}>
                {(comparisonData.teslaMate.capacityDegradation || 0).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Range Degradation Comparison */}
        <View style={styles.comparisonCard}>
          <Text style={styles.cardTitle}>Range Degradation</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.algorithmColumn}>
              <Text style={styles.algorithmName}>Current Algorithm</Text>
              <Text style={styles.algorithmValue}>
                {(comparisonData.current.rangeDegradation || 0).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.differenceColumn}>
              <Text style={[
                styles.differenceText,
                { color: getDifferenceColor(comparisonData.differences.rangeDegradation.difference, true) }
              ]}>
                {formatDifference(comparisonData.differences.rangeDegradation.difference, true)}
              </Text>
            </View>
            <View style={styles.algorithmColumn}>
              <Text style={styles.algorithmName}>TeslaMate Algorithm</Text>
              <Text style={styles.algorithmValue}>
                {(comparisonData.teslaMate.rangeDegradation || 0).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Analysis Summary</Text>
          <Text style={styles.summaryText}>
            The algorithms show {Math.abs(comparisonData.differences.healthScore.difference) < 5 ? 'similar' : 'different'} overall assessments. 
            {comparisonData.differences.healthScore.difference > 0 
              ? ' TeslaMate is more optimistic about battery health.' 
              : comparisonData.differences.healthScore.difference < 0 
              ? ' Current algorithm is more optimistic about battery health.'
              : ' Both algorithms agree on battery health.'
            }
          </Text>
          
          {isOfflineComparison && (
            <View style={styles.demoNotice}>
              <Text style={styles.demoNoticeText}>
                📊 This is a demonstration with mock data. Connect to your vehicle for real comparisons.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderDetailedTab = () => {
    if (!comparisonData) return null;

    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Detailed Metrics Comparison</Text>
        
        {/* Current Algorithm Details */}
        <View style={styles.detailCard}>
          <Text style={styles.detailCardTitle}>Current Algorithm</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Health Score</Text>
              <Text style={styles.detailValue}>{comparisonData.current.overallHealthScore || 0}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Capacity Loss</Text>
              <Text style={styles.detailValue}>{(comparisonData.current.capacityDegradation || 0).toFixed(1)}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Range Loss</Text>
              <Text style={styles.detailValue}>{(comparisonData.current.rangeDegradation || 0).toFixed(1)}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Est. Cycles</Text>
              <Text style={styles.detailValue}>{comparisonData.current.estimatedCycles || 0}</Text>
            </View>
          </View>
        </View>

        {/* TeslaMate Algorithm Details */}
        <View style={styles.detailCard}>
          <Text style={styles.detailCardTitle}>TeslaMate Algorithm</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Health Score</Text>
              <Text style={styles.detailValue}>{comparisonData.teslaMate.batteryHealthPercent || 0}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Capacity Loss</Text>
              <Text style={styles.detailValue}>{(comparisonData.teslaMate.capacityDegradation || 0).toFixed(1)}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Range Loss</Text>
              <Text style={styles.detailValue}>{(comparisonData.teslaMate.rangeDegradation || 0).toFixed(1)}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Method</Text>
              <Text style={styles.detailValue}>Historical Data</Text>
            </View>
          </View>
        </View>

        {/* Methodology Comparison */}
        <View style={styles.methodologyCard}>
          <Text style={styles.cardTitle}>Methodology Differences</Text>
          
          <View style={styles.methodItem}>
            <Text style={styles.methodTitle}>Current Algorithm</Text>
            <Text style={styles.methodDescription}>
              • Real-time vehicle data analysis{'\n'}
              • EPA range baseline comparison{'\n'}
              • Mileage and cycle-based degradation modeling{'\n'}
              • Temperature and usage pattern consideration
            </Text>
          </View>

          <View style={styles.methodItem}>
            <Text style={styles.methodTitle}>TeslaMate Algorithm</Text>
            <Text style={styles.methodDescription}>
              • Historical charging data analysis{'\n'}
              • Long-term capacity tracking{'\n'}
              • Database-driven degradation curves{'\n'}
              • Community-validated methodology
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderRawTab = () => {
    if (!comparisonData) return null;

    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Raw Algorithm Data</Text>
        
        <View style={styles.rawDataCard}>
          <Text style={styles.rawDataTitle}>Current Algorithm Response</Text>
          <Text style={styles.rawDataText}>
            {JSON.stringify(comparisonData.current, null, 2)}
          </Text>
        </View>

        <View style={styles.rawDataCard}>
          <Text style={styles.rawDataTitle}>TeslaMate Algorithm Response</Text>
          <Text style={styles.rawDataText}>
            {JSON.stringify(comparisonData.teslaMate, null, 2)}
          </Text>
        </View>

        <View style={styles.rawDataCard}>
          <Text style={styles.rawDataTitle}>Calculated Differences</Text>
          <Text style={styles.rawDataText}>
            {JSON.stringify(comparisonData.differences, null, 2)}
          </Text>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>
          {isOfflineComparison ? 'Preparing demo comparison...' : 'Comparing algorithms...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={checkVehicleAndRun}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('overview', 'Overview')}
        {renderTabButton('detailed', 'Detailed')}
        {renderTabButton('raw', 'Raw Data')}
      </View>

      {/* Content */}
      {selectedTab === 'overview' && renderOverviewTab()}
      {selectedTab === 'detailed' && renderDetailedTab()}
      {selectedTab === 'raw' && renderRawTab()}

      {/* Action Buttons */}
      {comparisonData && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={checkVehicleAndRun}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh Comparison</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
    backgroundColor: '#F5F7FA',
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
    backgroundColor: '#F5F7FA',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#9C27B0',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  comparisonHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  comparisonTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  comparisonSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  comparisonCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  algorithmColumn: {
    flex: 2,
    alignItems: 'center',
  },
  differenceColumn: {
    flex: 1,
    alignItems: 'center',
  },
  algorithmName: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  algorithmValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  differenceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  demoNotice: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  demoNoticeText: {
    fontSize: 12,
    color: '#E65100',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    margin: 16,
    marginBottom: 8,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  methodologyCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodItem: {
    marginBottom: 16,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  methodDescription: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
  },
  rawDataCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rawDataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  rawDataText: {
    fontSize: 10,
    color: '#666666',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  actionButtons: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  refreshButton: {
    backgroundColor: '#9C27B0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AlgorithmComparisonScreen;