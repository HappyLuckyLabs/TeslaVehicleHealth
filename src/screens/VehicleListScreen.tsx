import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import teslaAuth from '../services/ExpoTeslaAuthService';
import BatteryHealthReport from '../components/BatteryHealthReport';
import AlgorithmComparisonScreen from '../components/AlgorithmComparisonScreen';

export default function VehicleListScreen({ navigation: propNavigation }: { navigation?: any }) {
  // Try to get navigation from hook as fallback
  let navigation;
  try {
    navigation = useNavigation();
  } catch (error) {
    navigation = propNavigation;
  }

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'health' | 'comparison'>('list');
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Debug navigation
  console.log('VehicleListScreen Debug:');
  console.log('- propNavigation:', propNavigation);
  console.log('- useNavigation result:', navigation);
  console.log('- navigation available:', !!navigation);

  const handleTeslaLogin = async () => {
    try {
      setLoading(true);
      await teslaAuth.authenticateWithTesla();
      setIsAuthenticated(true);
      const userVehicles = await teslaAuth.getVehicles();
      setVehicles(userVehicles);
      Alert.alert('Success!', `Connected to ${userVehicles.length} vehicle(s)`);
    } catch (error: any) {
      Alert.alert('Authentication Failed', error?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await teslaAuth.logout();
      setIsAuthenticated(false);
      setVehicles([]);
      setCurrentView('list');
      setSelectedVehicle(null);
      Alert.alert('Logged Out', 'Successfully disconnected from Tesla');
    } catch (error: any) {
      Alert.alert('Logout Failed', error?.message || 'Logout failed');
    }
  };

  const testVehicleData = async (vehicleId: string) => {
    try {
      setLoading(true);
      const vehicleData = await teslaAuth.getVehicleData(vehicleId);
      const uiData = teslaAuth.transformToUIData(vehicleData);
      Alert.alert(
        'Vehicle Data',
        `Battery: ${uiData.battery.level}%\nRange: ${uiData.battery.range} km\nCharging: ${uiData.charging.isCharging ? 'Yes' : 'No'}`
      );
    } catch (error: any) {
      Alert.alert('Data Fetch Failed', error?.message || 'Data fetch failed');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to Battery Health Report
  const handleViewBatteryHealth = (vehicle: any) => {
    if (navigation?.navigate) {
      // Use React Navigation if available
      try {
        navigation.navigate('BatteryHealthReport', {
          vehicleId: vehicle.id,
          vehicleName: vehicle.display_name,
          vin: vehicle.vin
        });
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback to inline view
        setSelectedVehicle(vehicle);
        setCurrentView('health');
      }
    } else {
      // Fallback to inline view
      setSelectedVehicle(vehicle);
      setCurrentView('health');
    }
  };

  // Navigate to Algorithm Comparison
  const handleCompareAlgorithms = (vehicle: any) => {
    if (navigation?.navigate) {
      // Use React Navigation if available
      try {
        navigation.navigate('AlgorithmComparison', {
          vehicleId: vehicle.id,
          vehicleName: vehicle.display_name,
          vin: vehicle.vin
        });
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback to inline view
        setSelectedVehicle(vehicle);
        setCurrentView('comparison');
      }
    } else {
      // Fallback to inline view
      setSelectedVehicle(vehicle);
      setCurrentView('comparison');
    }
  };

  const goBackToList = () => {
    setCurrentView('list');
    setSelectedVehicle(null);
  };

  // Render Battery Health Report inline
  if (currentView === 'health' && selectedVehicle) {
    return (
      <View style={styles.container}>
        <View style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={goBackToList}>
            <Text style={styles.backButtonText}>← Back to Vehicles</Text>
          </TouchableOpacity>
        </View>
        <BatteryHealthReport
          route={{
            params: {
              vehicleId: selectedVehicle.id,
              vehicleName: selectedVehicle.display_name,
              vin: selectedVehicle.vin
            }
          }}
          navigation={{ navigate: (screen: string, params: any) => {
            if (screen === 'AlgorithmComparison') {
              setCurrentView('comparison');
            }
          }}}
        />
      </View>
    );
  }

  // Render Algorithm Comparison inline
  if (currentView === 'comparison' && selectedVehicle) {
    return (
      <View style={styles.container}>
        <View style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={goBackToList}>
            <Text style={styles.backButtonText}>← Back to Vehicles</Text>
          </TouchableOpacity>
        </View>
        <AlgorithmComparisonScreen
          vehicleId={selectedVehicle.id}
          vehicleName={selectedVehicle.display_name}
          vin={selectedVehicle.vin}
        />
      </View>
    );
  }

  // Render main vehicle list
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Tesla Vehicle Health</Text>
      <Text style={styles.subtitle}>Expo Test App</Text>
      
      {/* Debug Info */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Navigation Status: {navigation?.navigate ? '✅ Available' : '❌ Not Available'}
        </Text>
        <Text style={styles.debugText}>
          Mode: {navigation?.navigate ? 'React Navigation' : 'Inline Fallback'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {!isAuthenticated ? (
          <TouchableOpacity 
            style={[styles.button, styles.loginButton]}
            onPress={handleTeslaLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Connecting...' : 'Connect to Tesla'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity 
              style={[styles.button, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
            <Text style={styles.vehiclesTitle}>
              Your Vehicles ({vehicles.length})
            </Text>
            <ScrollView style={styles.vehiclesList}>
              {vehicles.map((vehicle) => (
                <View key={vehicle.id} style={styles.vehicleCard}>
                  <Text style={styles.vehicleName}>{vehicle.display_name}</Text>
                  <Text style={styles.vehicleInfo}>VIN: {vehicle.vin}</Text>
                  <Text style={styles.vehicleInfo}>State: {vehicle.state}</Text>
                  
                  {/* Test Vehicle Data Button */}
                  <TouchableOpacity
                    style={[styles.button, styles.testButton]}
                    onPress={() => testVehicleData(vehicle.id)}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Loading...' : 'Get Vehicle Data'}
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Battery Health Report Button */}
                  <TouchableOpacity
                    style={[styles.button, styles.healthButton]}
                    onPress={() => handleViewBatteryHealth(vehicle)}
                  >
                    <Text style={styles.buttonText}>🔋 Battery Health Report</Text>
                  </TouchableOpacity>
                  
                  {/* Algorithm Comparison Button */}
                  <TouchableOpacity
                    style={[styles.button, styles.comparisonButton]}
                    onPress={() => handleCompareAlgorithms(vehicle)}
                  >
                    <Text style={styles.buttonText}>🔬 Compare Algorithms</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </View>
      <Text style={styles.instructions}>
        {!isAuthenticated 
          ? 'Tap "Connect to Tesla" to start OAuth flow'
          : 'Connected! Tap any vehicle to explore battery health features.'
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  debugInfo: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    width: '90%',
  },
  debugText: {
    fontSize: 12,
    color: '#1976D2',
    textAlign: 'center',
  },
  backButtonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    backgroundColor: '#666',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '90%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 5,
    width: '100%',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#34C759',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  testButton: {
    backgroundColor: '#007AFF',
  },
  healthButton: {
    backgroundColor: '#32D74B',
  },
  comparisonButton: {
    backgroundColor: '#9C27B0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  vehiclesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  vehiclesList: {
    width: '100%',
    maxHeight: 400,
  },
  vehicleCard: {
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  instructions: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 20,
    paddingHorizontal: 20,
  },
});