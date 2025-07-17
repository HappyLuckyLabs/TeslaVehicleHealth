import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import VehicleListScreen from '../screens/VehicleListScreen';
import BatteryHealthReport from '../components/BatteryHealthReport';
import AlgorithmComparisonScreen from '../components/AlgorithmComparisonScreen';


const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="VehicleList" component={VehicleListScreen} options={{ title: 'Your Vehicles' }} />
        <Stack.Screen name="BatteryHealthReport" component={BatteryHealthReport} options={{ title: 'Battery Health Report' }}/>
       <Stack.Screen name="AlgorithmComparison" component={AlgorithmComparisonScreen} options={{ title: 'Algorithm Comparison' }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
} 
