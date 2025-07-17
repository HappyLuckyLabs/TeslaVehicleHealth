import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import VehicleListScreen from '../screens/VehicleListScreen';
import BatteryHealthReport from '../components/BatteryHealthReport';
import AlgorithmComparisonScreen from '../components/AlgorithmComparisonScreen';

// Define the navigation param list
export type RootStackParamList = {
  VehicleList: undefined;
  BatteryHealthReport: {
    vehicleId: string;
    vehicleName: string;
    vin: string;
  };
  AlgorithmComparison: {
    vehicleId: string;
    vehicleName: string;
    vin?: string;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="VehicleList">
        <Stack.Screen 
          name="VehicleList" 
          component={VehicleListScreen} 
          options={{ title: 'Your Vehicles' }} 
        />
        <Stack.Screen 
          name="BatteryHealthReport" 
          component={BatteryHealthReport} 
          options={{ title: 'Battery Health Report' }} 
        />
        <Stack.Screen 
          name="AlgorithmComparison" 
          component={AlgorithmComparisonScreen} 
          options={{ 
            title: 'Algorithm Comparison',
            headerStyle: {
              backgroundColor: '#9C27B0',
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}