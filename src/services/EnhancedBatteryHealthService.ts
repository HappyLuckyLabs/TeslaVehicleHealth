// EnhancedBatteryHealthService.ts
// Updated service with vehicle wake-up handling
import teslaAuth from './ExpoTeslaAuthService';
import VehicleWakeService from './VehicleWakeService';

class EnhancedBatteryHealthService {
  
  async getBatteryHealthAssessment(vehicleId: string, options: any = {}) {
    const {
      attemptWakeUp = true,
      showProgress = false,
      onStatusUpdate = null
    } = options;
    
    try {
      console.log('🔍 ENHANCED: Starting battery health assessment...');
      
      if (onStatusUpdate) onStatusUpdate('Checking vehicle status...');
      
      // First check vehicle state
      const vehicleState = await VehicleWakeService.getVehicleState(vehicleId);
      console.log('📊 Vehicle state:', vehicleState);
      
      if (onStatusUpdate) {
        onStatusUpdate(`Vehicle is ${vehicleState.state} - ${VehicleWakeService.getStatusMessage(vehicleState)}`);
      }
      
      // Decide whether to attempt wake-up
      let vehicleData;
      if (vehicleState.state === 'online') {
        // Vehicle is already online
        if (onStatusUpdate) onStatusUpdate('Getting vehicle data...');
        const result = await VehicleWakeService.getVehicleDataWithWakeUp(vehicleId);
        if (!result.success) throw new Error(result.error || 'Failed to get vehicle data');
        vehicleData = result.vehicleData;
        
      } else if (attemptWakeUp && VehicleWakeService.shouldAttemptWakeUp(vehicleState)) {
        // Attempt wake-up
        const likelihood = VehicleWakeService.getWakeUpLikelihood(vehicleState);
        if (onStatusUpdate) onStatusUpdate(`Attempting to wake vehicle (${likelihood} success chance)...`);
        
        const wakeResult = await VehicleWakeService.getVehicleDataWithWakeUp(vehicleId);
        
        if (!wakeResult.success) {
          // Return partial assessment with explanation
          return this.createOfflineAssessment(vehicleState, wakeResult.error);
        }
        
        vehicleData = wakeResult.vehicleData;
        if (onStatusUpdate) onStatusUpdate('Vehicle is now online! Analyzing battery...');
        
      } else {
        // Don't attempt wake-up or unlikely to succeed
        return this.createOfflineAssessment(vehicleState, 'Vehicle is offline and wake-up not attempted');
      }
      
      if (onStatusUpdate) onStatusUpdate('Analyzing battery health...');
      
      const validatedData = this.validateVehicleData(vehicleData);
      console.log('✅ ENHANCED Validated Data:', validatedData);
      
      const healthData = this.calculateBatteryHealthFixed(validatedData);
      
      // Add vehicle state info to result
      healthData.vehicleState = {
        ...vehicleState,
        statusMessage: VehicleWakeService.getStatusMessage(vehicleState),
        dataFreshness: 'real-time'
      };
      
      if (onStatusUpdate) onStatusUpdate('Analysis complete!');
      
      return healthData;
      
    } catch (error) {
      console.error('❌ Enhanced battery health assessment failed:', error);
      
      // Try to provide helpful error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('vehicle unavailable') || errorMessage.includes('408')) {
        const vehicleState = await VehicleWakeService.getVehicleState(vehicleId).catch(() => ({ state: 'unknown' }));
        return this.createOfflineAssessment(vehicleState as any, 'Vehicle is currently unavailable');
      }
      
      throw error;
    }
  }

  private createOfflineAssessment(vehicleState: any, reason: string) {
    const statusMessage = VehicleWakeService.getStatusMessage(vehicleState);
    const likelihood = VehicleWakeService.getWakeUpLikelihood(vehicleState);
    
    return {
      // Indicate this is an offline assessment
      isOfflineAssessment: true,
      vehicleState: {
        ...vehicleState,
        statusMessage,
        dataFreshness: 'unavailable'
      },
      
      // Provide estimated data based on vehicle state
      estimatedData: this.getEstimatedOfflineData(vehicleState),
      
      // Error information
      error: reason,
      
      // Guidance for user
      guidance: {
        canRetry: likelihood !== 'none',
        wakeUpLikelihood: likelihood,
        nextSteps: this.getNextStepsGuidance(vehicleState, likelihood),
        estimatedWakeTime: this.getEstimatedWakeTime(likelihood)
      },
      
      // Limited health data if available
      limitedHealthData: vehicleState.batteryLevel ? {
        currentBatteryLevel: vehicleState.batteryLevel,
        estimatedRange: vehicleState.batteryLevel * 4, // Rough estimate
        lastKnownState: vehicleState.lastSeen ? 'Last seen ' + this.formatLastSeen(vehicleState.lastSeen) : 'Unknown'
      } : null
    };
  }

  private getEstimatedOfflineData(vehicleState: any) {
    // Provide some estimated data based on what we know
    const estimatedData = {
      batteryLevel: vehicleState.batteryLevel || 50,
      estimatedRange: (vehicleState.batteryLevel || 50) * 4,
      lastKnownStatus: VehicleWakeService.getStatusMessage(vehicleState),
      dataQuality: 'estimated',
      disclaimer: 'This data is estimated. Connect to vehicle for accurate readings.'
    };
    
    return estimatedData;
  }

  private getNextStepsGuidance(vehicleState: any, likelihood: string) {
    switch (likelihood) {
      case 'high':
        return [
          'Tap "Try Wake Up" to attempt waking the vehicle',
          'Wake-up typically takes 30-60 seconds',
          'Ensure vehicle has cellular/WiFi connectivity'
        ];
      case 'medium':
        return [
          'Vehicle may wake up, but could take longer',
          'Try waking up when closer to the vehicle',
          'Check if vehicle has connectivity'
        ];
      case 'low':
        return [
          'Vehicle has been offline for a while',
          'Try again when vehicle is used next',
          'Physical access to vehicle may be needed'
        ];
      default:
        return [
          'Vehicle status unknown',
          'Check Tesla app for more information',
          'Ensure you have proper access permissions'
        ];
    }
  }

  private getEstimatedWakeTime(likelihood: string): string {
    switch (likelihood) {
      case 'high': return '30-60 seconds';
      case 'medium': return '1-3 minutes';
      case 'low': return '3-5 minutes (if possible)';
      default: return 'Unknown';
    }
  }

  private formatLastSeen(lastSeen: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  private validateVehicleData(rawData: any) {
    console.log('🔍 ENHANCED: Validating vehicle data...');
    
    const charge = rawData.charge_state || {};
    const vehicle = rawData.vehicle_state || {};
    
    // Extract key metrics with better validation
    const validatedData = {
      batteryLevel: this.validateNumber(charge.battery_level, 'battery_level'),
      usableBatteryLevel: this.validateNumber(charge.usable_battery_level, 'usable_battery_level'),
      
      // Use Tesla's own range data instead of EPA estimates
      currentRange: this.validateNumber(charge.est_battery_range || charge.battery_range, 'current_range'),
      idealRange: this.validateNumber(charge.ideal_battery_range, 'ideal_range'),
      ratedRange: this.validateNumber(charge.battery_range, 'rated_range'),
      
      odometer: this.validateNumber(vehicle.odometer, 'odometer'),
      chargingState: charge.charging_state || 'Unknown',
      chargeRate: this.validateNumber(charge.charge_rate, 'charge_rate'),
      
      // Additional useful data
      chargeEnergyAdded: this.validateNumber(charge.charge_energy_added, 'charge_energy_added'),
      chargeMilesAddedIdeal: this.validateNumber(charge.charge_miles_added_ideal, 'charge_miles_added_ideal'),
      chargeMilesAddedRated: this.validateNumber(charge.charge_miles_added_rated, 'charge_miles_added_rated'),
      
      // Store raw data for TeslaMate algorithms
      rawChargeState: charge,
      rawVehicleState: vehicle,
      
      // Vehicle model detection
      vehicleModel: this.detectVehicleModel(rawData),
      
      // Data timestamp
      dataTimestamp: new Date(),
      dataSource: 'Tesla Fleet API'
    };
    
    return validatedData;
  }

  private validateNumber(value: any, fieldName: string): number {
    const num = Number(value);
    if (isNaN(num)) {
      console.log(`⚠️ Invalid ${fieldName}: ${value}, using 0`);
      return 0;
    }
    console.log(`✓ Valid ${fieldName}: ${num}`);
    return num;
  }

  private detectVehicleModel(rawData: any): string {
    const config = rawData.vehicle_config || {};
    const carType = config.car_type;
    
    if (carType === 'model3') return 'Model 3';
    if (carType === 'models') return 'Model S';
    if (carType === 'modelx') return 'Model X';
    if (carType === 'modely') return 'Model Y';
    
    return 'Model 3'; // Default fallback
  }

  private calculateBatteryHealthFixed(validatedData: any) {
    // Using your existing algorithm for now - this would be where you'd integrate
    // either your current algorithm or the TeslaMate algorithms
    
    const efficiency = 0.2; // Default efficiency
    const currentCapacity = 75 * (validatedData.usableBatteryLevel / 100); // Estimate
    const maxCapacity = 75; // Model 3 default
    
    const capacityDegradation = Math.max(0, ((maxCapacity - currentCapacity) / maxCapacity) * 100);
    const rangeDegradation = validatedData.idealRange > 0 ? 
      Math.max(0, ((358 - validatedData.currentRange) / 358) * 100) : 0;
    
    const healthScore = Math.max(0, 100 - capacityDegradation - (rangeDegradation * 0.5));
    
    return {
      overallHealthScore: Math.round(healthScore),
      capacityDegradation: Math.round(capacityDegradation * 10) / 10,
      rangeDegradation: Math.round(rangeDegradation * 10) / 10,
      estimatedCycles: Math.round(validatedData.odometer / 443), // Estimate
      
      // Core metrics
      batteryLevel: validatedData.batteryLevel,
      currentRange: validatedData.currentRange,
      idealRange: validatedData.idealRange,
      chargingState: validatedData.chargingState,
      
      // Vehicle info
      vehicleModel: validatedData.vehicleModel,
      odometer: validatedData.odometer,
      
      // Debug info
      debugInfo: {
        calculationMethod: 'Enhanced with wake-up support',
        dataTimestamp: validatedData.dataTimestamp,
        dataSource: validatedData.dataSource
      }
    };
  }
}

export default new EnhancedBatteryHealthService();