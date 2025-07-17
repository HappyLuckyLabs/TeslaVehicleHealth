# Tesla Vehicle Health App

A React Native/Expo app that provides comprehensive battery health assessment for Tesla vehicles using the Tesla Fleet API.

## 🚗 Features

- **Tesla OAuth Authentication** - Secure login using Tesla's Fleet API
- **Vehicle Data Fetching** - Real-time vehicle data from Tesla's servers
- **Battery Health Assessment** - Comprehensive battery health analysis including:
  - Capacity degradation analysis
  - Range degradation tracking
  - Charge cycle estimation
  - Temperature management assessment
  - Market value impact analysis
- **Health Score Calculation** - 0 health score with detailed breakdown
- **Detailed Reports** - Exportable battery health reports with recommendations
- **React Navigation** - Smooth navigation between screens

## 📱 Screens
1ehicle List Screen** - Main screen showing:
   - Tesla authentication
   - List of user's vehicles
   - Quick vehicle data access
   - Navigation to battery health reports

2. **Battery Health Report Screen** - Detailed analysis showing:
   - Overall health score (0-100)
   - Key battery metrics
   - Detailed breakdown of health factors
   - Market impact assessment
   - Recommendations and concerns

## 🛠️ Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for screen management
- **Tesla Fleet API** for vehicle data
- **Expo Auth Session** for OAuth
- **Expo Secure Store** for token management

## 📋 Prerequisites

- Node.js (v16 or higher)
- Expo CLI
- Tesla Fleet API credentials
- iOS Simulator or Android Emulator (optional)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd TeslaVehicleHealth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Tesla API credentials**
   
   Youll need to set up Tesla Fleet API credentials in `src/services/ExpoTeslaAuthService.ts`:
   ```typescript
   const TESLA_CONFIG = [object Object]   clientId: your-client-id',
     clientSecret: 'your-client-secret',
     redirectUri: your-redirect-uri',
     // ... other config
   };
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5 **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app

## 📁 Project Structure

```
src/
├── components/
│   ├── BatteryHealthReport.tsx    # Battery health report UI
│   └── BatteryDebugScreen.tsx     # Debug screen for development
├── navigation/
│   └── AppNavigator.tsx           # React Navigation setup
├── screens/
│   └── VehicleListScreen.tsx      # Main vehicle list screen
└── services/
    ├── ExpoTeslaAuthService.ts    # Tesla OAuth and API calls
    └── BatteryHealthService.ts    # Battery health calculations
```

## 🔧 Configuration

### Tesla API Setup1 Register your app with Tesla Fleet API
2. Get your `clientId` and `clientSecret`
3. Set up your redirect URI
4 Update the `TESLA_CONFIG` in `ExpoTeslaAuthService.ts`

### Environment Variables

Create a `.env` file (optional):
```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=your-redirect-uri
```

## 📊 Battery Health Assessment

The app calculates battery health using multiple factors:

### Core Metrics
- **Capacity Degradation** - Loss of battery capacity over time
- **Range Degradation** - Reduction in driving range
- **Charge Cycles** - Estimated number of charge cycles
- **Temperature Management** - Battery temperature optimization

### Health Score Calculation
- Base score: 100
- Range degradation penalty:-1 % lost
- Capacity degradation penalty:-1.5 per % lost
- Mileage penalty: Based on vehicle age
- Cycle penalty: Based on charging frequency
- Bonus: +5 for excellent battery management

### Health Grades
- **Excellent (90-100- Like new battery
- **Good (75-89 - Normal wear for age
- **Fair (60-74)** - Some degradation
- **Poor (0-59Significant issues

## 🔍 API Endpoints Used

- `POST /oauth2/v3/token` - OAuth token exchange
- `GET /api/1/vehicles` - Get users vehicles
- `GET /api/1/vehicles/{id}/vehicle_data` - Get vehicle data
- `GET /api/1/vehicles/{id}/charge_state` - Get charging data
- `GET /api/1/vehicles/[object Object]id}/climate_state` - Get climate data

## 🐛 Debugging

The app includes comprehensive logging for debugging:

```typescript
// Enable debug mode in BatteryHealthService.ts
console.log('🔍 DEBUG: Starting battery health assessment...');
console.log(📊 RAW TESLA DATA:', JSON.stringify(rawData, null, 2));
```

## 📱 Usage

1. **Launch the app**2 **Tap Connect to Tesla"** to authenticate
3. **Select a vehicle** from your Tesla account
4. **Tap "View Battery Health Report"** for detailed analysis
5. **Review the health score and recommendations**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature`)
4.Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This app is for educational and personal use only. Battery health assessments are estimates based on available Tesla API data and should not be considered professional automotive advice. Always consult with Tesla service for official battery diagnostics.

## 🆘 Troubleshooting

### Common Issues

1. **"Couldn't find a navigation object"**
   - Ensure you're using the latest version of React Navigation
   - Check that all screens are properly wrapped in NavigationContainer

2sla API404rors**
   - Verify your Tesla API credentials
   - Ensure the vehicle is online and accessible
   - Check that your app has the correct permissions

3. **Battery health calculation errors**
   - Verify that vehicle data is being fetched correctly
   - Check the console logs for validation errors
   - Ensure the vehicle has sufficient data for analysis

### Getting Help

- Check the console logs for detailed error messages
- Verify your Tesla API credentials are correct
- Ensure your vehicle is online and accessible
- Try restarting the Expo development server

## 📈 Future Enhancements

- [ ] Historical battery health tracking
- [ ] Push notifications for battery alerts
- [ ] Integration with Tesla service appointments
- [ ] Advanced battery analytics
-vehicle comparison
-  Export reports to PDF
- ud sync for health data 