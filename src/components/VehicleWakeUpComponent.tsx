// VehicleWakeUpComponent.tsx
// UI component for handling vehicle wake-up with progress
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import VehicleWakeService from '../services/VehicleWakeService';
import EnhancedBatteryHealthService from '../services/EnhancedBatteryHealthService';

interface VehicleWakeUpProps {
  vehicleId: string;
  vehicleName: string;
  onSuccess: (healthData: any) => void;
  onCancel: () => void;
  visible: boolean;
}

const VehicleWakeUpComponent: React.FC<VehicleWakeUpProps> = ({
  vehicleId,
  vehicleName,
  onSuccess,
  onCancel,
  visible
}) => {
  const [isWaking, setIsWaking] = useState(false);
  const [wakeStatus, setWakeStatus] = useState('');
  const [wakeProgress, setWakeProgress] = useState(0);
  const [vehicleState, setVehicleState] = useState<any>(null);
  const [showOfflineOptions, setShowOfflineOptions] = useState(false);

  React.useEffect(() => {
    if (visible && vehicleId) {
      checkVehicleStatus();
    }
  }, [visible, vehicleId]);

  const checkVehicleStatus = async () => {
    try {
      const state = await VehicleWakeService.getVehicleState(vehicleId);
      setVehicleState(state);
      
      if (state.state === 'online') {
        // Vehicle is already online, proceed directly
        await handleGetBatteryHealth(false);
      } else {
        setShowOfflineOptions(true);
      }
    } catch (error) {
      console.error('Failed to check vehicle status:', error);
      Alert.alert('Error', 'Failed to check vehicle status. Please try again.');
    }
  };

  const handleWakeUpAndAnalyze = async () => {
    setIsWaking(true);
    setWakeStatus('Initializing wake-up...');
    setWakeProgress(10);
    
    try {
      const result = await EnhancedBatteryHealthService.getBatteryHealthAssessment(
        vehicleId, 
        {
          attemptWakeUp: true,
          showProgress: true,
          onStatusUpdate: (status: string) => {
            setWakeStatus(status);
            // Update progress based on status
            if (status.includes('Checking')) setWakeProgress(20);
            else if (status.includes('wake')) setWakeProgress(40);
            else if (status.includes('online')) setWakeProgress(70);
            else if (status.includes('Analyzing')) setWakeProgress(90);
            else if (status.includes('complete')) setWakeProgress(100);
          }
        }
      );
      
      if (result.isOfflineAssessment) {
        // Show offline assessment options
        showOfflineAssessmentDialog(result);
      } else {
        // Success! Vehicle woke up and we have data
        setWakeProgress(100);
        setWakeStatus('Analysis complete!');
        setTimeout(() => onSuccess(result), 500);
      }
      
    } catch (error) {
      console.error('Wake-up failed:', error);
      Alert.alert(
        'Wake-up Failed', 
        'Could not wake up the vehicle. The vehicle may be in deep sleep or out of range.',
        [
          { text: 'Try Again', onPress: handleWakeUpAndAnalyze },
          { text: 'Cancel', onPress: onCancel }
        ]
      );
    } finally {
      setIsWaking(false);
    }
  };

  const handleGetBatteryHealth = async (attemptWakeUp: boolean) => {
    setIsWaking(true);
    setWakeStatus('Getting vehicle data...');
    
    try {
      const result = await EnhancedBatteryHealthService.getBatteryHealthAssessment(
        vehicleId,
        { 
          attemptWakeUp,
          onStatusUpdate: setWakeStatus
        }
      );
      
      if (result.isOfflineAssessment) {
        showOfflineAssessmentDialog(result);
      } else {
        onSuccess(result);
      }
      
    } catch (error) {
      console.error('Failed to get battery health:', error);
      Alert.alert('Error', 'Failed to analyze battery health. Please try again.');
    } finally {
      setIsWaking(false);
    }
  };

  const showOfflineAssessmentDialog = (result: any) => {
    const guidance = result.guidance || {};
    const nextSteps = guidance.nextSteps || [];
    
    Alert.alert(
      'Vehicle Offline',
      `Vehicle Status: ${result.vehicleState?.statusMessage}\n\n` +
      `Wake-up likelihood: ${guidance.wakeUpLikelihood}\n` +
      `Estimated time: ${guidance.estimatedWakeTime}\n\n` +
      `What would you like to do?`,
      [
        {
          text: 'Try Wake Up',
          onPress: handleWakeUpAndAnalyze,
          style: guidance.canRetry ? 'default' : 'destructive'
        },
        {
          text: 'View Estimates',
          onPress: () => onSuccess(result)
        },
        {
          text: 'Cancel',
          onPress: onCancel,
          style: 'cancel'
        }
      ]
    );
  };

  const renderVehicleStatusCard = () => {
    if (!vehicleState) return null;

    const statusMessage = VehicleWakeService.getStatusMessage(vehicleState);
    const likelihood = VehicleWakeService.getWakeUpLikelihood(vehicleState);
    
    const getStatusColor = () => {
      switch (vehicleState.state) {
        case 'online': return '#4CAF50';
        case 'asleep': return '#FF9800';
        case 'offline': return '#F44336';
        default: return '#9E9E9E';
      }
    };

    const getLikelihoodColor = () => {
      switch (likelihood) {
        case 'high': return '#4CAF50';
        case 'medium': return '#FF9800';
        case 'low': return '#F44336';
        default: return '#9E9E9E';
      }
    };

    return (
      <View style={styles.statusCard}>
        <Text style={styles.vehicleName}>{vehicleName}</Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor() }]}>
            {statusMessage}
          </Text>
        </View>

        {vehicleState.batteryLevel && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Battery:</Text>
            <Text style={styles.statusValue}>{vehicleState.batteryLevel}%</Text>
          </View>
        )}

        {vehicleState.lastSeen && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Seen:</Text>
            <Text style={styles.statusValue}>
              {new Date(vehicleState.lastSeen).toLocaleString()}
            </Text>
          </View>
        )}

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Wake-up Chance:</Text>
          <Text style={[styles.statusValue, { color: getLikelihoodColor() }]}>
            {likelihood.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  const renderWakeUpProgress = () => (
    <View style={styles.progressContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.progressText}>{wakeStatus}</Text>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${wakeProgress}%` }]} />
      </View>
      
      <Text style={styles.progressPercent}>{wakeProgress}%</Text>
    </View>
  );

  const renderOfflineOptions = () => (
    <View style={styles.optionsContainer}>
      <Text style={styles.optionsTitle}>Vehicle Options</Text>
      
      <TouchableOpacity
        style={[styles.optionButton, styles.primaryButton]}
        onPress={handleWakeUpAndAnalyze}
        disabled={isWaking}
      >
        <Text style={styles.primaryButtonText}>
          {isWaking ? 'Waking Up...' : '⏰ Try to Wake Up Vehicle'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.optionButton, styles.secondaryButton]}
        onPress={() => handleGetBatteryHealth(false)}
        disabled={isWaking}
      >
        <Text style={styles.secondaryButtonText}>
          📊 Show Estimated Data
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.optionButton, styles.cancelButton]}
        onPress={onCancel}
        disabled={isWaking}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Vehicle Connection</Text>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {renderVehicleStatusCard()}
          
          {isWaking ? renderWakeUpProgress() : (
            showOfflineOptions && renderOfflineOptions()
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  vehicleName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    alignItems: 'center',
    padding: 30,
  },
  progressText: {
    fontSize: 16,
    color: '#333',
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  optionsContainer: {
    flex: 1,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    marginTop: 20,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default VehicleWakeUpComponent;