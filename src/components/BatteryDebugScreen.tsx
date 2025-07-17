import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import debugBatteryHealthService from '../services/BatteryHealthService';

interface DebugData {
  rawTeslaData: any;
  validatedData: any;
  calculations: {
    originalSpecs: any;
    rangeDegradation: number;
    capacityDegradation: number;
    estimatedCycles: number;
    healthScoreSteps: {
      startingScore: number;
      rangePenalty: number;
      capacityPenalty: number;
      mileagePenalty: number;
      cyclePenalty: number;
      finalScore: number;
    };
  };
  assessmentLogic: any;
  timestamp: string;
}

interface BatteryDebugScreenProps {
  visible: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleName: string;
}

const BatteryDebugScreen: React.FC<BatteryDebugScreenProps> = ({
  visible,
  onClose,
  vehicleId,
  vehicleName
}) => {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const fetchDebugData = async () => {
    try {
      setLoading(true);
      
      // Capture console logs
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args) => {
        logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
        originalLog(...args);
      };

      // Get health assessment with debug info
      const healthResult = await debugBatteryHealthService.getBatteryHealthAssessment(vehicleId);
      
      // Restore console.log
      console.log = originalLog;
      
      // Extract debug information
      const debugInfo: DebugData = {
        rawTeslaData: healthResult.debugInfo?.rawData || {},
        validatedData: {
          batteryLevel: healthResult.batteryLevel,
          currentRange: healthResult.estimatedRange,
          originalRange: healthResult.epaRange,
          totalMileage: healthResult.totalMileage,
          chargingState: healthResult.chargingState,
          vehicleModel: healthResult.debugInfo?.vehicleModel || 'Unknown'
        },
        calculations: {
          originalSpecs: healthResult.debugInfo?.originalSpecs || {},
          rangeDegradation: healthResult.rangeDegradation,
          capacityDegradation: healthResult.capacityDegradation,
          estimatedCycles: healthResult.estimatedCycles,
          healthScoreSteps: {
            startingScore: 100,
            rangePenalty: healthResult.rangeDegradation * 1.5,
            capacityPenalty: healthResult.capacityDegradation * 2,
            mileagePenalty: healthResult.totalMileage > 160000 ? 15 : healthResult.totalMileage > 80000 ? 8 : 0,
            cyclePenalty: healthResult.estimatedCycles > 1000 ? 10 : healthResult.estimatedCycles > 500 ? 5 : 0,
            finalScore: healthResult.overallHealthScore
          }
        },
        assessmentLogic: {
          healthGrade: healthResult.healthGrade,
          strengths: healthResult.strengths,
          concerns: healthResult.concerns,
          recommendations: healthResult.recommendations,
          marketImpact: healthResult.marketImpact
        },
        timestamp: new Date().toISOString()
      };
      
      setDebugData(debugInfo);
      
    } catch (error) {
      Alert.alert('Debug Error', 'Failed to fetch debug data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && vehicleId) {
      fetchDebugData();
    }
  }, [visible, vehicleId]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const renderCollapsibleSection = (title: string, key: string, content: React.ReactNode) => {
    const isExpanded = expandedSections.has(key);
    
    return (
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection(key)}
        >
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.sectionContent}>
            {content}
          </View>
        )}
      </View>
    );
  };

  const renderKeyValue = (key: string, value: any, indent: number = 0) => (
    <View style={[styles.keyValueRow, { marginLeft: indent * 16 }]} key={key}>
      <Text style={styles.keyText}>{key}:</Text>
      <Text style={styles.valueText}>
        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Generating debug data...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Battery Health Debug</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchDebugData}>
            <Text style={styles.refreshText}>🔄</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {debugData && (
            <>
              {/* Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{vehicleName}</Text>
                <Text style={styles.summaryText}>
                  Generated: {new Date(debugData.timestamp).toLocaleString()}
                </Text>
                <Text style={styles.summaryText}>
                  Final Health Score: {debugData.calculations.healthScoreSteps.finalScore}/100
                </Text>
              </View>

              {/* Raw Tesla Data */}
              {renderCollapsibleSection(
                "🔌 Raw Tesla API Data",
                "rawData",
                <View>
                  <Text style={styles.description}>
                    This is the unprocessed data directly from Tesla's Fleet API:
                  </Text>
                  <View style={styles.codeBlock}>
                    <Text style={styles.codeText}>
                      {JSON.stringify(debugData.rawTeslaData, null, 2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Validated Data */}
              {renderCollapsibleSection(
                "✅ Validated & Processed Data",
                "validatedData",
                <View>
                  <Text style={styles.description}>
                    Key metrics extracted and validated from raw data:
                  </Text>
                  {Object.entries(debugData.validatedData).map(([key, value]) =>
                    renderKeyValue(key, value)
                  )}
                </View>
              )}

              {/* Original Specifications */}
              {renderCollapsibleSection(
                "📋 Original Vehicle Specifications",
                "originalSpecs",
                <View>
                  <Text style={styles.description}>
                    Reference specifications for {debugData.validatedData.vehicleModel}:
                  </Text>
                  {Object.entries(debugData.calculations.originalSpecs).map(([key, value]) =>
                    renderKeyValue(key, value)
                  )}
                </View>
              )}

              {/* Degradation Calculations */}
              {renderCollapsibleSection(
                "📉 Degradation Calculations",
                "degradation",
                <View>
                  <Text style={styles.description}>
                    How battery and range degradation percentages are calculated:
                  </Text>
                  
                  <View style={styles.calculationBox}>
                    <Text style={styles.calculationTitle}>Range Degradation:</Text>
                    <Text style={styles.calculationFormula}>
                      ({debugData.calculations.originalSpecs.epaRange} - {debugData.validatedData.currentRange}) ÷ {debugData.calculations.originalSpecs.epaRange} × 100
                    </Text>
                    <Text style={styles.calculationResult}>
                      = {debugData.calculations.rangeDegradation.toFixed(1)}%
                    </Text>
                  </View>

                  <View style={styles.calculationBox}>
                    <Text style={styles.calculationTitle}>Capacity Degradation:</Text>
                    <Text style={styles.calculationFormula}>
                      Estimated from range degradation × 0.8 factor
                    </Text>
                    <Text style={styles.calculationResult}>
                      = {debugData.calculations.capacityDegradation.toFixed(1)}%
                    </Text>
                  </View>

                  <View style={styles.calculationBox}>
                    <Text style={styles.calculationTitle}>Estimated Charge Cycles:</Text>
                    <Text style={styles.calculationFormula}>
                      {debugData.validatedData.totalMileage} km ÷ 443 km per cycle
                    </Text>
                    <Text style={styles.calculationResult}>
                      = {debugData.calculations.estimatedCycles} cycles
                    </Text>
                  </View>
                </View>
              )}

              {/* Health Score Calculation */}
              {renderCollapsibleSection(
                "🎯 Health Score Calculation",
                "healthScore",
                <View>
                  <Text style={styles.description}>
                    Step-by-step health score calculation:
                  </Text>
                  
                  <View style={styles.scoreSteps}>
                    <View style={styles.scoreStep}>
                      <Text style={styles.stepText}>Starting Score</Text>
                      <Text style={styles.stepValue}>{debugData.calculations.healthScoreSteps.startingScore}</Text>
                    </View>
                    
                    <View style={styles.scoreStep}>
                      <Text style={styles.stepText}>Range Penalty (-{debugData.calculations.rangeDegradation.toFixed(1)}% × 1.5)</Text>
                      <Text style={[styles.stepValue, styles.penalty]}>-{debugData.calculations.healthScoreSteps.rangePenalty.toFixed(1)}</Text>
                    </View>
                    
                    <View style={styles.scoreStep}>
                      <Text style={styles.stepText}>Capacity Penalty (-{debugData.calculations.capacityDegradation.toFixed(1)}% × 2)</Text>
                      <Text style={[styles.stepValue, styles.penalty]}>-{debugData.calculations.healthScoreSteps.capacityPenalty.toFixed(1)}</Text>
                    </View>
                    
                    <View style={styles.scoreStep}>
                      <Text style={styles.stepText}>Mileage Penalty</Text>
                      <Text style={[styles.stepValue, styles.penalty]}>-{debugData.calculations.healthScoreSteps.mileagePenalty}</Text>
                    </View>
                    
                    <View style={styles.scoreStep}>
                      <Text style={styles.stepText}>Cycle Penalty</Text>
                      <Text style={[styles.stepValue, styles.penalty]}>-{debugData.calculations.healthScoreSteps.cyclePenalty}</Text>
                    </View>
                    
                    <View style={[styles.scoreStep, styles.finalStep]}>
                      <Text style={styles.finalStepText}>Final Health Score</Text>
                      <Text style={styles.finalStepValue}>{debugData.calculations.healthScoreSteps.finalScore}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Assessment Logic */}
              {renderCollapsibleSection(
                "🧠 Assessment Logic",
                "assessment",
                <View>
                  <Text style={styles.description}>
                    How the final grade and recommendations are determined:
                  </Text>
                  
                  <View style={styles.assessmentSection}>
                    <Text style={styles.assessmentTitle}>Health Grade Logic:</Text>
                    <Text style={styles.assessmentText}>
                      Score {debugData.calculations.healthScoreSteps.finalScore} = Grade "{debugData.assessmentLogic.healthGrade}"
                    </Text>
                    <Text style={styles.assessmentText}>
                      (90-100: Excellent, 75-89: Good, 60-74: Fair, 0-59: Poor)
                    </Text>
                  </View>

                  <View style={styles.assessmentSection}>
                    <Text style={styles.assessmentTitle}>Strengths ({debugData.assessmentLogic.strengths.length}):</Text>
                    {debugData.assessmentLogic.strengths.map((strength: string, index: number) => (
                      <Text key={index} style={styles.listItem}>• {strength}</Text>
                    ))}
                  </View>

                  <View style={styles.assessmentSection}>
                    <Text style={styles.assessmentTitle}>Concerns ({debugData.assessmentLogic.concerns.length}):</Text>
                    {debugData.assessmentLogic.concerns.map((concern: string, index: number) => (
                      <Text key={index} style={styles.listItem}>• {concern}</Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Market Impact */}
              {renderCollapsibleSection(
                "💰 Market Impact Calculation",
                "marketImpact",
                <View>
                  <Text style={styles.description}>
                    How market value impact is estimated:
                  </Text>
                  {Object.entries(debugData.assessmentLogic.marketImpact).map(([key, value]) =>
                    renderKeyValue(key, value)
                  )}
                </View>
              )}

              {/* Data Quality Assessment */}
              <View style={styles.qualitySection}>
                <Text style={styles.sectionTitle}>📊 Data Quality Assessment</Text>
                <View style={styles.qualityGrid}>
                  <View style={styles.qualityItem}>
                    <Text style={styles.qualityLabel}>Battery Level</Text>
                    <Text style={[styles.qualityStatus, debugData.validatedData.batteryLevel > 0 ? styles.good : styles.poor]}>
                      {debugData.validatedData.batteryLevel > 0 ? '✓ Valid' : '✗ Missing'}
                    </Text>
                  </View>
                  
                  <View style={styles.qualityItem}>
                    <Text style={styles.qualityLabel}>Range Data</Text>
                    <Text style={[styles.qualityStatus, debugData.validatedData.currentRange > 0 ? styles.good : styles.poor]}>
                      {debugData.validatedData.currentRange > 0 ? '✓ Valid' : '✗ Missing'}
                    </Text>
                  </View>
                  
                  <View style={styles.qualityItem}>
                    <Text style={styles.qualityLabel}>Mileage</Text>
                    <Text style={[styles.qualityStatus, debugData.validatedData.totalMileage > 0 ? styles.good : styles.poor]}>
                      {debugData.validatedData.totalMileage > 0 ? '✓ Valid' : '✗ Missing'}
                    </Text>
                  </View>
                  
                  <View style={styles.qualityItem}>
                    <Text style={styles.qualityLabel}>Vehicle Model</Text>
                    <Text style={[styles.qualityStatus, debugData.validatedData.vehicleModel !== 'Unknown' ? styles.good : styles.warning]}>
                      {debugData.validatedData.vehicleModel !== 'Unknown' ? '✓ Detected' : '⚠ Estimated'}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}

          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </Modal>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#666666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  expandIcon: {
    fontSize: 16,
    color: '#666666',
  },
  sectionContent: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 20,
  },
  codeBlock: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333333',
    lineHeight: 16,
  },
  keyValueRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  keyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    minWidth: 120,
  },
  valueText: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    fontFamily: 'monospace',
  },
  calculationBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  calculationFormula: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  calculationResult: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  scoreSteps: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
  },
  scoreStep: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stepText: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
  },
  stepValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    minWidth: 60,
    textAlign: 'right',
  },
  penalty: {
    color: '#F44336',
  },
  finalStep: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
    paddingTop: 12,
    marginTop: 8,
  },
  finalStepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  finalStepValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2196F3',
    minWidth: 60,
    textAlign: 'right',
  },
  assessmentSection: {
    marginBottom: 16,
  },
  assessmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  assessmentText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  listItem: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    paddingLeft: 8,
  },
  qualitySection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  qualityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  qualityItem: {
    width: '48%',
    marginBottom: 12,
  },
  qualityLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  qualityStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  good: {
    color: '#4CAF50',
  },
  warning: {
    color: '#FF9800',
  },
  poor: {
    color: '#F44336',
  },
});

export default BatteryDebugScreen;