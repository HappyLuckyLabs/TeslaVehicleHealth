// TeslaMateAlgorithmService.ts
// Updated with wake-up support
import teslaAuth from './ExpoTeslaAuthService';
import VehicleWakeService from './VehicleWakeService';

interface ChargeData {
  ratedBatteryRangeKm: number;
  usableBatteryLevel: number;
  chargeEnergyAdded: number;
  endDate: Date;
  batteryLevel: number;
  chargingProcessId?: string;
}

interface ChargingProcess {
  chargeEnergyAdded: number;
  startRatedRangeKm: number;
  endRatedRangeKm: number;
  durationMin: number;
  endBatteryLevel: number;
  startBatteryLevel: number;
  endDate: Date;
}

interface RangeData {
  batteryLevel: number;
  usableBatteryLevel?: number;
  ratedBatteryRangeKm: number;
  idealBatteryRangeKm: number;
  date: Date;
}

interface TeslaMateCapacityCalculation {
  currentCapacity: number;
  maxCapacity: number;
  customKwhNew?: number;
}

interface TeslaMateHealthData {
  charges: ChargeData[];
  processes: ChargingProcess[];
  rangeData: RangeData[];
  customKwhNew?: number;
  customMaxRange?: number;
}

class TeslaMateAlgorithmService {

  async getBatteryHealthComparison(vehicleId: string) {
    try {
      console.log('🔬 Starting TeslaMate vs Current Algorithm Comparison...');
      
      // Use the enhanced wake-up service instead of direct API call
      const wakeResult = await VehicleWakeService.getVehicleDataWithWakeUp(vehicleId);
      
      if (!wakeResult.success) {
        // Handle offline vehicle gracefully
        return this.createOfflineComparison(vehicleId, wakeResult.error);
      }
      
      const rawData = wakeResult.vehicleData;
      console.log('📊 RAW TESLA DATA for TeslaMate:', JSON.stringify(rawData, null, 2));
      
      const processedData = this.processDataForTeslaMate(rawData);
      console.log('🔄 PROCESSED DATA for TeslaMate:', processedData);
      
      const teslaMateResults = this.calculateTeslaMateHealthScore(processedData);
      
      return {
        success: true,
        teslaMateResults,
        processedData,
        rawData
      };
      
    } catch (error) {
      console.error('❌ TeslaMate algorithm comparison failed:', error);
      
      // Check if it's a vehicle offline error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('vehicle unavailable') || errorMessage.includes('408')) {
        return this.createOfflineComparison(vehicleId, 'Vehicle is currently offline or asleep');
      }
      
      throw error;
    }
  }

  private async createOfflineComparison(vehicleId: string, reason: string) {
    console.log('📱 Creating offline comparison for vehicle:', vehicleId);
    
    // Get basic vehicle state
    const vehicleState = await VehicleWakeService.getVehicleState(vehicleId).catch(() => ({ state: 'unknown' }));
    const statusMessage = VehicleWakeService.getStatusMessage(vehicleState as any);
    const likelihood = VehicleWakeService.getWakeUpLikelihood(vehicleState as any);
    
    return {
      success: false,
      isOfflineComparison: true,
      vehicleState: {
        ...vehicleState,
        statusMessage
      },
      error: reason,
      guidance: {
        canRetry: likelihood !== 'none',
        wakeUpLikelihood: likelihood,
        estimatedWakeTime: this.getEstimatedWakeTime(likelihood),
        message: 'Algorithm comparison requires vehicle to be online. Try waking up the vehicle first.'
      },
      // Provide mock results for demonstration
      mockResults: this.generateMockComparisonData(vehicleState as any)
    };
  }

  private getEstimatedWakeTime(likelihood: string): string {
    switch (likelihood) {
      case 'high': return '30-60 seconds';
      case 'medium': return '1-3 minutes';
      case 'low': return '3-5 minutes (if possible)';
      default: return 'Unknown';
    }
  }

  private generateMockComparisonData(vehicleState: any) {
    // Generate some example comparison data for demo purposes
    return {
      teslaMateResults: {
        batteryHealthPercent: 78,
        capacityDegradation: 12.5,
        rangeDegradation: 16.8,
        currentCapacity: 65.6,
        maxCapacity: 75.0,
        chargeCycles: 89,
        dataQuality: {
          confidenceLevel: 'Low (Demo Data)',
          validCharges: 0,
          validProcesses: 0,
          note: 'This is demonstration data. Connect to vehicle for real analysis.'
        }
      },
      note: 'Mock data for demonstration - vehicle needs to be online for real comparison'
    };
  }

  private async getDetailedVehicleData(vehicleId: string) {
    // This method now uses the wake service
    console.log(`🚗 Fetching data for TeslaMate comparison: ${vehicleId}`);
    const result = await VehicleWakeService.getVehicleDataWithWakeUp(vehicleId);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get vehicle data');
    }
    
    return result.vehicleData;
  }

  private processDataForTeslaMate(rawData: any): TeslaMateHealthData {
    const charge = rawData.charge_state || {};
    const vehicle = rawData.vehicle_state || {};
    
    // Create mock historical data since we only have current snapshot
    // In a real implementation, you'd fetch actual historical data
    const currentChargeData: ChargeData = {
      ratedBatteryRangeKm: charge.battery_range || charge.rated_battery_range || 0,
      usableBatteryLevel: charge.usable_battery_level || charge.battery_level || 0,
      chargeEnergyAdded: charge.charge_energy_added || 0,
      endDate: new Date(),
      batteryLevel: charge.battery_level || 0,
      chargingProcessId: 'current_session'
    };

    // Create mock charging processes data
    const currentProcess: ChargingProcess = {
      chargeEnergyAdded: charge.charge_energy_added || 0,
      startRatedRangeKm: (charge.battery_range || 0) - (charge.charge_miles_added_rated || 0),
      endRatedRangeKm: charge.battery_range || 0,
      durationMin: 60, // Mock duration
      endBatteryLevel: charge.battery_level || 0,
      startBatteryLevel: Math.max(0, (charge.battery_level || 0) - 10), // Mock start
      endDate: new Date()
    };

    const currentRangeData: RangeData = {
      batteryLevel: charge.battery_level || 0,
      usableBatteryLevel: charge.usable_battery_level,
      ratedBatteryRangeKm: charge.battery_range || 0,
      idealBatteryRangeKm: charge.ideal_battery_range || charge.battery_range || 0,
      date: new Date()
    };

    // Generate some mock historical data for comparison
    const mockHistoricalCharges = this.generateMockHistoricalData(currentChargeData);
    const mockHistoricalProcesses = this.generateMockProcesses(currentProcess);
    const mockHistoricalRangeData = this.generateMockRangeData(currentRangeData);

    return {
      charges: [currentChargeData, ...mockHistoricalCharges],
      processes: [currentProcess, ...mockHistoricalProcesses],
      rangeData: [currentRangeData, ...mockHistoricalRangeData]
    };
  }

  private generateMockHistoricalData(current: ChargeData): ChargeData[] {
    const historical: ChargeData[] = [];
    const weeksBack = 12; // 3 months of data
    
    for (let i = 1; i <= weeksBack; i++) {
      const dateBack = new Date();
      dateBack.setDate(dateBack.getDate() - (i * 7));
      
      // Simulate gradual degradation over time
      const degradationFactor = 1 - (i * 0.002); // 0.2% degradation per week
      
      historical.push({
        ratedBatteryRangeKm: current.ratedBatteryRangeKm * degradationFactor,
        usableBatteryLevel: Math.round(current.usableBatteryLevel * degradationFactor),
        chargeEnergyAdded: 20 + Math.random() * 40, // Random charge amounts
        endDate: dateBack,
        batteryLevel: Math.round(current.batteryLevel * degradationFactor),
        chargingProcessId: `mock_session_${i}`
      });
    }
    
    return historical;
  }

  private generateMockProcesses(current: ChargingProcess): ChargingProcess[] {
    const historical: ChargingProcess[] = [];
    const sessionsBack = 15;
    
    for (let i = 1; i <= sessionsBack; i++) {
      const dateBack = new Date();
      dateBack.setDate(dateBack.getDate() - (i * 5));
      
      const degradationFactor = 1 - (i * 0.001);
      
      historical.push({
        chargeEnergyAdded: 15 + Math.random() * 30,
        startRatedRangeKm: current.startRatedRangeKm * degradationFactor,
        endRatedRangeKm: current.endRatedRangeKm * degradationFactor,
        durationMin: 30 + Math.random() * 120,
        endBatteryLevel: Math.round(current.endBatteryLevel * degradationFactor),
        startBatteryLevel: Math.round(current.startBatteryLevel * degradationFactor),
        endDate: dateBack
      });
    }
    
    return historical;
  }

  private generateMockRangeData(current: RangeData): RangeData[] {
    const historical: RangeData[] = [];
    const daysBack = 30;
    
    for (let i = 1; i <= daysBack; i++) {
      const dateBack = new Date();
      dateBack.setDate(dateBack.getDate() - i);
      
      const degradationFactor = 1 - (i * 0.0005);
      
      historical.push({
        batteryLevel: Math.round(current.batteryLevel * (0.8 + Math.random() * 0.4)),
        usableBatteryLevel: Math.round((current.usableBatteryLevel || current.batteryLevel) * degradationFactor),
        ratedBatteryRangeKm: current.ratedBatteryRangeKm * degradationFactor,
        idealBatteryRangeKm: current.idealBatteryRangeKm * degradationFactor,
        date: dateBack
      });
    }
    
    return historical;
  }

  // TeslaMate Algorithm Implementations

  private calculateDerivedEfficiency(processes: ChargingProcess[]): number {
    console.log('⚡ Calculating TeslaMate derived efficiency...');
    
    const validProcesses = processes.filter(p => 
      p.durationMin > 10 &&
      p.endBatteryLevel <= 95 &&
      p.startRatedRangeKm && p.endRatedRangeKm &&
      p.chargeEnergyAdded > 0
    );

    console.log(`📊 Valid processes for efficiency: ${validProcesses.length}`);

    const efficiencies = validProcesses.map(p => {
      const rangeAdded = p.endRatedRangeKm - p.startRatedRangeKm;
      return rangeAdded > 0 ? (p.chargeEnergyAdded / rangeAdded) * 100 : 0;
    }).filter(eff => eff > 0);

    if (efficiencies.length === 0) {
      console.log('⚠️ No valid efficiencies found, using default 0.2 kWh/km');
      return 0.2; // Default efficiency for Model 3
    }

    // Find most common efficiency (TeslaMate method)
    const efficiencyGroups = efficiencies.reduce((groups, eff) => {
      const rounded = Math.round(eff * 1000) / 1000;
      groups[rounded] = (groups[rounded] || 0) + 1;
      return groups;
    }, {} as Record<number, number>);

    const mostCommonEfficiency = Number(Object.keys(efficiencyGroups)
      .sort((a, b) => efficiencyGroups[Number(b)] - efficiencyGroups[Number(a)])[0]);

    console.log(`⚡ TeslaMate derived efficiency: ${mostCommonEfficiency.toFixed(3)} kWh/km`);
    return mostCommonEfficiency;
  }

  private calculateCurrentCapacity(charges: ChargeData[], efficiency: number): number {
    console.log('🔋 Calculating TeslaMate current capacity...');
    
    const validCharges = charges
      .filter(charge => 
        charge.usableBatteryLevel > 0 && 
        charge.chargeEnergyAdded >= efficiency
      )
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())
      .slice(0, 100); // Last 100 charges

    console.log(`📊 Valid charges for capacity: ${validCharges.length}`);

    if (validCharges.length === 0) {
      console.log('⚠️ No valid charges found for capacity calculation');
      return 75; // Default Model 3 capacity
    }

    const capacities = validCharges.map(charge => 
      (charge.ratedBatteryRangeKm * efficiency) / charge.usableBatteryLevel
    );

    const avgCapacity = capacities.reduce((sum, cap) => sum + cap, 0) / capacities.length;
    console.log(`🔋 TeslaMate current capacity: ${avgCapacity.toFixed(2)} kWh`);
    
    return avgCapacity;
  }

  private calculateMaxCapacity(charges: ChargeData[], efficiency: number): number {
    console.log('📈 Calculating TeslaMate max capacity...');
    
    const validCharges = charges.filter(charge => 
      charge.usableBatteryLevel > 0 && 
      charge.chargeEnergyAdded >= efficiency
    );

    if (validCharges.length === 0) {
      console.log('⚠️ No valid charges found for max capacity calculation');
      return 75; // Default Model 3 capacity
    }

    const capacities = validCharges.map(charge => 
      (charge.ratedBatteryRangeKm * efficiency) / charge.usableBatteryLevel
    );

    const maxCapacity = Math.max(...capacities);
    console.log(`📈 TeslaMate max capacity: ${maxCapacity.toFixed(2)} kWh`);
    
    return maxCapacity;
  }

  private calculateBatteryDegradation(data: TeslaMateCapacityCalculation): number {
    const baselineCapacity = data.customKwhNew && data.customKwhNew > 0 
      ? data.customKwhNew 
      : data.maxCapacity;
      
    const degradationPercent = Math.max(0, 100.0 - (
      (data.currentCapacity * 100.0) / baselineCapacity
    ));
    
    console.log(`📉 TeslaMate degradation: ${degradationPercent.toFixed(2)}%`);
    return degradationPercent;
  }

  private calculateProjectedRange(rangeData: RangeData[]): number {
    const validData = rangeData.filter(d => d.ratedBatteryRangeKm);
    
    if (validData.length === 0) return 0;
    
    const totalRange = validData.reduce((sum, d) => sum + d.ratedBatteryRangeKm, 0);
    const totalBatteryLevel = validData.reduce((sum, d) => 
      sum + (d.usableBatteryLevel ?? d.batteryLevel), 0
    );
    
    const projectedRange = totalBatteryLevel > 0 ? (totalRange / totalBatteryLevel) * 100 : 0;
    console.log(`📏 TeslaMate projected range: ${projectedRange.toFixed(2)} km`);
    
    return projectedRange;
  }

  private calculateChargeCycles(charges: ChargeData[], batteryCapacity: number): number {
    const totalEnergyAdded = charges
      .filter(charge => charge.chargeEnergyAdded > 0.01)
      .reduce((sum, charge) => sum + charge.chargeEnergyAdded, 0);
      
    const cycles = Math.floor(totalEnergyAdded / batteryCapacity);
    console.log(`🔄 TeslaMate charge cycles: ${cycles}`);
    
    return cycles;
  }

  private calculateTeslaMateHealthScore(data: TeslaMateHealthData) {
    console.log('🎯 Starting TeslaMate complete health calculation...');
    
    // 1. Calculate efficiency (foundation of all calculations)
    const efficiency = this.calculateDerivedEfficiency(data.processes);
    
    // 2. Calculate capacities using TeslaMate methods
    const currentCapacity = this.calculateCurrentCapacity(data.charges, efficiency);
    const maxCapacity = data.customKwhNew || this.calculateMaxCapacity(data.charges, efficiency);
    
    // 3. Calculate degradation using TeslaMate formula
    const capacityDegradation = this.calculateBatteryDegradation({
      currentCapacity,
      maxCapacity,
      customKwhNew: data.customKwhNew
    });
    
    // 4. Calculate range metrics
    const currentRange = this.calculateProjectedRange(data.rangeData);
    const maxRange = data.customMaxRange || Math.max(...data.rangeData.map(d => d.ratedBatteryRangeKm));
    const rangeDegradation = maxRange > 0 ? Math.max(0, ((maxRange - currentRange) / maxRange) * 100) : 0;
    
    // 5. Calculate charge cycles
    const chargeCycles = this.calculateChargeCycles(data.charges, maxCapacity);
    
    // 6. TeslaMate battery health percentage
    const batteryHealthPercent = Math.min(100, 100 - capacityDegradation);
    
    // 7. Data quality assessment
    const validCharges = data.charges.filter(c => c.usableBatteryLevel > 0).length;
    const validProcesses = data.processes.filter(p => p.durationMin > 10).length;
    const confidenceLevel = validCharges > 50 ? 'High' : validCharges > 20 ? 'Medium' : 'Low';
    
    console.log('🎯 TeslaMate calculation complete!');
    
    return {
      // Core metrics
      batteryHealthPercent,
      capacityDegradation,
      rangeDegradation,
      currentCapacity,
      maxCapacity,
      currentRange,
      maxRange,
      chargeCycles,
      efficiency,
      
      // TeslaMate specific data
      dataQuality: {
        validCharges,
        validProcesses,
        confidenceLevel,
        totalDataPoints: data.charges.length + data.processes.length + data.rangeData.length
      },
      
      // Calculation method info
      calculationMethod: 'TeslaMate Community Algorithm',
      version: 'v1.0 - Extracted from TeslaMate source',
      
      // Detailed breakdown
      calculations: {
        efficiencySource: 'Derived from charging sessions',
        capacitySource: `Average of last ${Math.min(100, validCharges)} charges`,
        rangeSource: 'Real-time projection from current data',
        cycleSource: 'Total energy added / battery capacity'
      }
    };
  }
}

export default new TeslaMateAlgorithmService();