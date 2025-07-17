import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import teslaAuth from '../services/ExpoTeslaAuthService';

export default function VehicleListScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

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

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Tesla Vehicle Health</Text>
      <Text style={styles.subtitle}>Expo Test App</Text>
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
                    style={[styles.button, styles.healthReportButton]}
                    onPress={() => navigation.navigate('BatteryHealthReport', {
                      vehicleId: vehicle.id,
                      vehicleName: vehicle.display_name,
                      vin: vehicle.vin
                    })}
                  >
                    <Text style={styles.buttonText}>
                      View Battery Health Report
                    </Text>
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
          : 'Connected! Try getting vehicle data'
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginVertical: 10,
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
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  vehiclesTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 20,
    textAlign: 'center',
  },
  vehiclesList: {
    flex: 1,
  },
  vehicleCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  instructions: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    fontSize: 14,
  },
  healthReportButton: {
    backgroundColor: '#FFD600',
    marginTop: 10,
  },
}); 