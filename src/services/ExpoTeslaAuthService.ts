// src/services/ExpoTeslaAuthService.ts
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { Linking } from 'react-native';

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

// Tesla Fleet API Configuration (Updated endpoints)
const TESLA_CONFIG = {
  clientId: '124da6ba-e55a-4b9e-a7ea-a8a2da05b3e8',
  clientSecret: 'ta-secret.g_V!7Gr^qPXMLG_p',
  redirectUri: 'https://tesla-oauth-proxy.onrender.com/auth/tesla/callback',
  scopes: [
    'openid',
    'offline_access',
    'vehicle_device_data',
    'vehicle_location',
    'vehicle_charging_cmds'
  ],
  // Use Fleet Auth endpoints
  authUrl: 'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/authorize',
  tokenUrl: 'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token',
  apiBaseUrl: 'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1',
  audience: 'https://fleet-api.prd.na.vn.cloud.tesla.com',
  partnerTokenUrl: 'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts',
  domain: 'tesla-oauth-proxy.onrender.com'
};

interface TeslaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface VehicleData {
  id: string;
  vin: string;
  display_name: string;
  state: 'online' | 'asleep' | 'offline';
  charge_state: {
    battery_level: number;
    est_battery_range: number;
    energy_remaining: number;
    charging_state: string;
    charge_limit_soc: number;
    charge_amps: number;
    charger_voltage: number;
    charger_actual_current: number;
    charger_power: number;
    dc_charging_power: number;
    ac_charging_energy_in: number;
    dc_charging_energy_in: number;
    battery_heater_on: boolean;
  };
  vehicle_state: {
    odometer: number;
    speed: number | null;
    charge_port_door_open: boolean;
    charge_port_latch: string;
    fast_charger_present: boolean;
    fast_charger_type: string;
  };
}

class ExpoTeslaAuthService {
  private tokens: TeslaTokens | null = null;

  constructor() {
    this.loadTokensFromSecureStore();
  }

  // Step 1: Get Partner Token (client credentials)
  private async getPartnerToken(): Promise<string> {
    try {
      console.log('Getting partner token...');
      
      const response = await fetch(TESLA_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: TESLA_CONFIG.clientId,
          client_secret: TESLA_CONFIG.clientSecret,
          audience: TESLA_CONFIG.audience,
          scope: 'openid vehicle_device_data vehicle_cmds vehicle_charging_cmds',
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Partner token failed: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log('Partner token obtained successfully');
      return data.access_token;
    } catch (error) {
      console.error('Partner token error:', error);
      throw error;
    }
  }

  // Step 2: Register Partner Account (try without domain)
  private async registerPartnerAccount(): Promise<void> {
    try {
      const partnerToken = await this.getPartnerToken();
      
      console.log('Registering partner account...');
      
      const response = await fetch(TESLA_CONFIG.partnerTokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${partnerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Try without domain first - maybe that's causing the public key requirement
        })
      });

      console.log('Partner registration response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Partner registration successful:', data);
      } else if (response.status === 409) {
        console.log('Partner already registered - continuing...');
      } else {
        const errorText = await response.text();
        console.log('Partner registration failed:', errorText);
        // Try alternative registration method
        await this.registerWithDomainOnly(partnerToken);
      }
    } catch (error) {
      console.error('Partner registration error:', error);
      // Don't throw error - continue anyway
    }
  }

  // Alternative registration method
  private async registerWithDomainOnly(partnerToken: string): Promise<void> {
    try {
      console.log('Trying domain-only registration...');
      
      const response = await fetch(TESLA_CONFIG.partnerTokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${partnerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: TESLA_CONFIG.domain
        })
      });

      if (response.ok || response.status === 409) {
        console.log('Domain registration successful or already exists');
      } else {
        const errorText = await response.text();
        console.log('Domain registration also failed:', errorText);
      }
    } catch (error) {
      console.error('Domain registration error:', error);
    }
  }

  // User OAuth Flow (Third-party tokens)
  async authenticateWithTesla(): Promise<TeslaTokens> {
    try {
      // Try to register as partner first
      await this.registerPartnerAccount();

      // Create OAuth URL with Fleet Auth endpoint
      const authUrl = `${TESLA_CONFIG.authUrl}?${new URLSearchParams({
        response_type: 'code',
        client_id: TESLA_CONFIG.clientId,
        redirect_uri: TESLA_CONFIG.redirectUri,
        scope: TESLA_CONFIG.scopes.join(' '),
        state: this.generateRandomState(),
        locale: 'en-US',
        prompt: 'login'
      }).toString()}`;

      console.log('Opening Tesla Fleet Auth...');
      console.log('Auth URL:', authUrl);

      // Use WebBrowser for in-app authentication
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'teslahealth://oauth'
      );

      console.log('WebBrowser result:', result);

      if (result.type === 'success' && result.url) {
        // Parse the code from the URL
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (code) {
          console.log('Got authorization code:', code);
          // Exchange code for tokens using Fleet API
          const tokens = await this.exchangeCodeForTokens(code);
          await this.saveTokensToSecureStore(tokens);
          this.tokens = tokens;
          return tokens;
        } else {
          throw new Error('No authorization code received');
        }
      } else {
        throw new Error('OAuth authentication was cancelled or failed');
      }
    } catch (error) {
      console.error('Tesla authentication failed:', error);
      throw error;
    }
  }

  // Exchange authorization code for access tokens (Fleet API)
  private async exchangeCodeForTokens(code: string): Promise<TeslaTokens> {
    try {
      console.log('Exchanging code for tokens...');
      
      const response = await fetch(TESLA_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: TESLA_CONFIG.clientId,
          client_secret: TESLA_CONFIG.clientSecret,
          code: code,
          audience: TESLA_CONFIG.audience,  // Required for Fleet API
          redirect_uri: TESLA_CONFIG.redirectUri,
          scope: TESLA_CONFIG.scopes.join(' ')
        }).toString(),
      });

      console.log('Token exchange response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Token exchange error:', errorData);
        throw new Error(`Token exchange failed: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log('Token exchange successful');
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
      };
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken(): Promise<TeslaTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      console.log('Refreshing access token...');
      
      const response = await fetch(TESLA_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: TESLA_CONFIG.clientId,
          refresh_token: this.tokens.refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Token refresh error:', errorData);
        throw new Error(`Token refresh failed: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      const newTokens: TeslaTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.tokens.refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000),
      };

      await this.saveTokensToSecureStore(newTokens);
      this.tokens = newTokens;
      console.log('Token refresh successful');
      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  // Get valid access token (with auto-refresh)
  private async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('No tokens available. Please authenticate first.');
    }

    // Check if token needs refresh (5 minutes buffer)
    if (Date.now() >= this.tokens.expiresAt - 300000) {
      await this.refreshAccessToken();
    }

    return this.tokens!.accessToken;
  }

  // Get user's vehicles
  async getVehicles(): Promise<VehicleData[]> {
    const accessToken = await this.getValidAccessToken();
    
    try {
      console.log('Getting vehicles from Tesla Fleet API...');
      
      const response = await fetch(`${TESLA_CONFIG.apiBaseUrl}/vehicles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TeslaVehicleHealth/1.0',
          'Accept': 'application/json',
        },
      });

      console.log('Vehicles API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Vehicles API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        
        throw new Error(`Get vehicles error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Success! Vehicles data:', data);
      return data.response || [];
    } catch (error) {
      console.error('Get vehicles failed:', error);
      throw error;
    }
  }

  // Get specific vehicle data
  async getVehicleData(vehicleId: string): Promise<VehicleData> {
    const accessToken = await this.getValidAccessToken();
    
    try {
      // Wake up vehicle first
      await this.wakeUpVehicle(vehicleId);
      
      const response = await fetch(`${TESLA_CONFIG.apiBaseUrl}/vehicles/${vehicleId}/vehicle_data`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TeslaVehicleHealth/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Get vehicle data error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Get vehicle data failed:', error);
      throw error;
    }
  }

  // Wake up vehicle
  private async wakeUpVehicle(vehicleId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken();
    
    try {
      const response = await fetch(`${TESLA_CONFIG.apiBaseUrl}/vehicles/${vehicleId}/wake_up`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TeslaVehicleHealth/1.0',
        },
      });

      if (!response.ok) {
        console.warn(`Wake up vehicle warning: ${response.status}`);
      }

      // Wait for vehicle to wake up
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.warn('Wake up vehicle failed (non-critical):', error);
    }
  }

  // Secure storage methods using Expo SecureStore
  private async saveTokensToSecureStore(tokens: TeslaTokens): Promise<void> {
    try {
      await SecureStore.setItemAsync('tesla_tokens', JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to save tokens to secure store:', error);
    }
  }

  private async loadTokensFromSecureStore(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync('tesla_tokens');
      if (stored) {
        this.tokens = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load tokens from secure store:', error);
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return this.tokens !== null && Date.now() < this.tokens.expiresAt - 300000;
  }

  async logout(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('tesla_tokens');
      this.tokens = null;
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  private generateRandomState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Transform vehicle data for UI components
  transformToUIData(vehicleData: VehicleData) {
    return {
      battery: {
        level: vehicleData.charge_state.battery_level,
        range: vehicleData.charge_state.est_battery_range,
        energyRemaining: vehicleData.charge_state.energy_remaining,
        isCharging: vehicleData.charge_state.charging_state === 'Charging',
      },
      charging: {
        isCharging: vehicleData.charge_state.charging_state === 'Charging',
        state: vehicleData.charge_state.charging_state,
        power: vehicleData.charge_state.dc_charging_power || vehicleData.charge_state.charger_power || 0,
        voltage: vehicleData.charge_state.charger_voltage,
        current: vehicleData.charge_state.charge_amps,
        limit: vehicleData.charge_state.charge_limit_soc,
      },
      vehicle: {
        odometer: vehicleData.vehicle_state.odometer,
        speed: vehicleData.vehicle_state.speed,
        chargePortOpen: vehicleData.vehicle_state.charge_port_door_open,
        chargePortLatch: vehicleData.vehicle_state.charge_port_latch,
        fastChargerPresent: vehicleData.vehicle_state.fast_charger_present,
        fastChargerType: vehicleData.vehicle_state.fast_charger_type,
      },
    };
  }
}

// Export singleton instance
export const teslaAuth = new ExpoTeslaAuthService();
export default teslaAuth;