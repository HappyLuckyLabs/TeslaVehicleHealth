// AlgorithmComparisonScreen.tsx
// Updated with wake-up support and offline handling
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
  vehicleId: string;
  vehicleName: string;
}

const AlgorithmComparisonScreen: React.FC<AlgorithmComparisonScreenProps> = ({
  vehicleId,
  vehicleName
}) => {
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'detailed' | 'raw'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [vehicleState, setVehicleState] = useState<any>(null);
  const [isOfflineComparison, setIsOfflineComparison] = useState(false);

  useEffect(() => {
    checkVehicleAndRun();
  }, [vehicleId]);

  const checkVehicleAndRun = async () => {
    try {
      // First check vehicle state
      const state = await VehicleWakeService.getVehicleState(vehicleId);
      setVehicleState(state);
      
      if (state.state === 'online') {
        // Vehicle is online, run comparison
        await runComparison();
      } else {
        // Vehicle is offline, offer options
        showOfflineOptions(state);
      }
    } catch (error) {
      console.error('Failed to check vehicle state:', error);
      setError('Failed to check vehicle status');
    }
  };

  const showOfflineOptions = (state: any) => {
    const statusMessage = VehicleWakeService.getStatusMessage(state);
    const likelihood = VehicleWakeService.getWakeUpLikelihood(state);
    
    Alert.alert(
      'Vehicle Offline',
      `Vehicle Status: ${statusMessage}\n\n` +
      `Algorithm comparison works best with online vehicles.\n\n` +
      `Wake-up likelihood: ${likelihood}\n\n` +
      `What would you like to do?`,
      [
        {
          text: 'Try Wake Up',
          onPress: runComparisonWithWakeUp,
          style: likelihood !== 'none' ? 'default' : 'destructive'
        },
        {
          text: 'Demo Mode',
          onPress: runOfflineDemo
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const runComparisonWithWakeUp = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔬 Starting algorithm comparison with wake-up...');
      
      // Try to wake up the vehicle first
      const wakeResult = await VehicleWakeService.getVehicleDataWithWakeUp(vehicleId);
      
      if (!wakeResult.success) {
        // Wake-up failed, run offline demo
        Alert.alert(
          'Wake-up Failed',
          'Could not wake up the vehicle. Would you like to see a demonstration with mock data?',
          [
            { text: 'Show Demo', onPress: runOfflineDemo },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }
      
      // Vehicle is now online, run real comparison
      await runComparison();
      
    } catch (error) {
      console.error('❌ Wake-up and comparison failed:', error);
      setError('Failed to wake up vehicle and run comparison');
    } finally {
      setLoading(false);
    }
  };

  const runOfflineDemo = async () => {
    setLoading(true);
    setError(null);
    setIsOfflineComparison(true);
    
    try {
      console.log('🎭 Running offline demo comparison...');
      
      // Generate mock current algorithm results
      const mockCurrentResults = {
        overallHealthScore: 86,
        capacityDegradation: 0,
        rangeDegradation: 19.2,
        estimatedCycles: 74,
        debugInfo: {
          calculationMethod: 'Current Algorithm (Demo)',
          note: 'Mock data for demonstration'
        }
      };
      
      // Get TeslaMate offline results
      const teslaMateResults = await TeslaMateAlgorithmService.getBatteryHealthComparison(vehicleId);
      
      const differences = calculateDifferences(
        mockCurrentResults, 
        teslaMateResults.mockResults?.teslaMateResults || teslaMateResults.teslaMateResults
      );
      
      setComparisonData({
        current: mockCurrentResults,
        teslaMate: teslaMateResults.mockResults?.teslaMateResults || teslaMateResults.teslaMateResults,
        differences
      });
      
      console.log('✅ Offline demo comparison complete!');
      
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
        setError('TeslaMate comparison requires online vehicle data');
        return;
      }

      // Calculate differences
      const differences = calculateDifferences(currentResults, teslaMateResults.teslaMateResults);
      
      setComparisonData({
        current: currentResults,
        teslaMate: teslaMateResults.teslaMateResults,
        differences
      });
      
      console.log('✅ Real algorithm comparison complete!');
      
    } catch (err) {
      console.error('❌ Comparison failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Comparison failed';
      
      if (errorMessage.includes('vehicle unavailable') || errorMessage.includes('408')) {
        setError('Vehicle is offline. Use "Demo Mode" to see how the comparison works.');
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

  // You'll need to add the rest of your component here
  // including the render method and any other functions/JSX
  
  return (
    <View style={styles.container}>
      {/* Add your JSX content here */}
      <Text>Algorithm Comparison Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default AlgorithmComparisonScreen;