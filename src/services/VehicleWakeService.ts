// VehicleWakeService.ts
// Service to handle Tesla vehicle wake-up and offline states
import teslaAuth from './ExpoTeslaAuthService';

interface WakeUpResult {
  success: boolean;
  isOnline: boolean;
  vehicleData?: any;
  error?: string;
  timeoutReached?: boolean;
}

interface VehicleState {
  state: 'online' | 'asleep' | 'offline' | 'unknown';
  lastSeen?: Date;
  batteryLevel?: number;
}

class VehicleWakeService {
  private wakeUpTimeout = 120000; // 2 minutes max wait time
  private checkInterval = 5000; // Check every 5 seconds
  private maxRetries = 3;

  async getVehicleDataWithWakeUp(vehicleId: string): Promise<WakeUpResult> {
    console.log(`🚗 Attempting to get vehicle data for: ${vehicleId}`);
    
    try {
      // First, try to get data without waking up
      const directData = await this.tryGetVehicleData(vehicleId);
      if (directData.success) {
        console.log('✅ Vehicle already online, data retrieved successfully');
        return directData;
      }

      // If vehicle is offline/asleep, attempt wake-up
      console.log('😴 Vehicle appears to be asleep/offline, attempting wake-up...');
      return await this.wakeUpAndGetData(vehicleId);

    } catch (error) {
      console.error('❌ Failed to get vehicle data:', error);
      return {
        success: false,
        isOnline: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async tryGetVehicleData(vehicleId: string): Promise<WakeUpResult> {
    try {
      const vehicleData = await teslaAuth.getVehicleData(vehicleId);
      
      return {
        success: true,
        isOnline: true,
        vehicleData
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a sleep/offline error
      if (errorMessage.includes('vehicle unavailable') || 
          errorMessage.includes('asleep') || 
          errorMessage.includes('offline') ||
          errorMessage.includes('408')) {
        
        console.log('😴 Vehicle is asleep or offline');
        return {
          success: false,
          isOnline: false,
          error: 'Vehicle is asleep or offline'
        };
      }
      
      // Some other error
      throw error;
    }
  }

  private async wakeUpAndGetData(vehicleId: string): Promise<WakeUpResult> {
    console.log('⏰ Starting wake-up process...');
    
    try {
      // Send wake-up command
      await this.sendWakeUpCommand(vehicleId);
      
      // Poll for vehicle to come online
      const startTime = Date.now();
      let attempts = 0;
      
      while (Date.now() - startTime < this.wakeUpTimeout) {
        attempts++;
        console.log(`🔄 Wake-up attempt ${attempts}...`);
        
        // Wait before checking
        await this.sleep(this.checkInterval);
        
        // Try to get data
        const result = await this.tryGetVehicleData(vehicleId);
        if (result.success) {
          console.log(`✅ Vehicle woke up successfully after ${Math.round((Date.now() - startTime) / 1000)}s`);
          return result;
        }
        
        // If still sleeping, send another wake command every 30 seconds
        if ((Date.now() - startTime) % 30000 < this.checkInterval) {
          console.log('📞 Sending additional wake-up command...');
          await this.sendWakeUpCommand(vehicleId);
        }
      }
      
      // Timeout reached
      console.log('⏰ Wake-up timeout reached');
      return {
        success: false,
        isOnline: false,
        error: 'Vehicle wake-up timeout - please try again later',
        timeoutReached: true
      };
      
    } catch (error) {
      console.error('❌ Wake-up process failed:', error);
      return {
        success: false,
        isOnline: false,
        error: error instanceof Error ? error.message : 'Wake-up failed'
      };
    }
  }

  private async sendWakeUpCommand(vehicleId: string): Promise<void> {
    try {
      console.log('📞 Sending wake-up command to vehicle...');
      
      // Tesla Fleet API wake-up endpoint
      const response = await fetch(`https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/vehicles/${vehicleId}/wake_up`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await teslaAuth.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`⚠️ Wake-up command returned ${response.status}, but this is often normal`);
        // Don't throw error - wake-up commands often return errors even when working
      } else {
        console.log('✅ Wake-up command sent successfully');
      }
      
    } catch (error) {
      console.log('⚠️ Wake-up command failed, but continuing anyway:', error);
      // Don't throw - sometimes wake-up works even if the command appears to fail
    }
  }

  async getVehicleState(vehicleId: string): Promise<VehicleState> {
    try {
      // Try to get basic vehicle info without full data
      const vehicles = await teslaAuth.getVehicles();
      const vehicle = vehicles.find((v: any) => v.id_s === vehicleId || v.id === vehicleId);
      
      if (!vehicle) {
        return { state: 'unknown' };
      }
      
      return {
        state: vehicle.state || 'unknown',
        lastSeen: vehicle.last_seen ? new Date(vehicle.last_seen) : undefined,
        batteryLevel: vehicle.charge_state?.battery_level
      };
      
    } catch (error) {
      console.error('❌ Failed to get vehicle state:', error);
      return { state: 'unknown' };
    }
  }

  async checkMultipleVehiclesStatus(vehicleIds: string[]): Promise<Record<string, VehicleState>> {
    console.log('🔍 Checking status of multiple vehicles...');
    
    const results: Record<string, VehicleState> = {};
    
    try {
      const vehicles = await teslaAuth.getVehicles();
      
      for (const vehicleId of vehicleIds) {
        const vehicle = vehicles.find((v: any) => 
          v.id_s === vehicleId || v.id.toString() === vehicleId
        );
        
        if (vehicle) {
          results[vehicleId] = {
            state: vehicle.state || 'unknown',
            lastSeen: vehicle.last_seen ? new Date(vehicle.last_seen) : undefined,
            batteryLevel: vehicle.charge_state?.battery_level
          };
        } else {
          results[vehicleId] = { state: 'unknown' };
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to check vehicle statuses:', error);
      // Return unknown status for all vehicles
      vehicleIds.forEach(id => {
        results[id] = { state: 'unknown' };
      });
    }
    
    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method to determine if we should attempt wake-up
  shouldAttemptWakeUp(vehicleState: VehicleState): boolean {
    if (vehicleState.state === 'online') return false;
    if (vehicleState.state === 'unknown') return true; // Try anyway
    
    // Don't try to wake up if vehicle has been offline for too long
    if (vehicleState.lastSeen) {
      const hoursSinceLastSeen = (Date.now() - vehicleState.lastSeen.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSeen > 24) {
        console.log(`⚠️ Vehicle last seen ${hoursSinceLastSeen.toFixed(1)} hours ago - may not wake up`);
        return false;
      }
    }
    
    return true;
  }

  // Get friendly status message for UI
  getStatusMessage(vehicleState: VehicleState): string {
    switch (vehicleState.state) {
      case 'online':
        return 'Online';
      case 'asleep':
        return 'Sleeping';
      case 'offline':
        const lastSeen = vehicleState.lastSeen;
        if (lastSeen) {
          const hoursAgo = Math.round((Date.now() - lastSeen.getTime()) / (1000 * 60 * 60));
          return `Offline (${hoursAgo}h ago)`;
        }
        return 'Offline';
      default:
        return 'Status Unknown';
    }
  }

  // Estimate wake-up likelihood
  getWakeUpLikelihood(vehicleState: VehicleState): 'high' | 'medium' | 'low' | 'none' {
    if (vehicleState.state === 'online') return 'none';
    if (vehicleState.state === 'asleep') return 'high';
    
    if (vehicleState.lastSeen) {
      const hoursSinceLastSeen = (Date.now() - vehicleState.lastSeen.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSeen < 1) return 'high';
      if (hoursSinceLastSeen < 6) return 'medium';
      if (hoursSinceLastSeen < 24) return 'low';
    }
    
    return 'low';
  }
}

export default new VehicleWakeService();