import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Import หน้าจอทั้งหมด
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import StockScreen from './screens/StockScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import AddMedicationScreen from './screens/AddMedicationScreen';
import AddSymptomScreen from './screens/AddSymptomScreen';
import AlarmScreen from './screens/AlarmScreen';
import ManageCaregiverScreen from './screens/ManageCaregiverScreen';
import CaregiverHomeScreen from './screens/CaregiverHomeScreen';
import CaregiverDashboardScreen from './screens/CaregiverDashboardScreen';
import AdminHomeScreen from './screens/AdminHomeScreen';
import AdminUserManagementScreen from './screens/AdminUserManagementScreen';
import AdminMedicationMasterScreen from './screens/AdminMedicationMasterScreen';
import ScanScreen from './screens/ScanScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import CaregiverProfileScreen from './screens/CaregiverProfileScreen';
import EditMedicationScreen from './screens/EditMedicationScreen';
import MasterSearchScreen from './screens/MasterSearchScreen';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ route }) {
  // กันเหนียว: ถ้าไม่มี user ส่งมา ให้ default เป็น Guest
  const user = route.params?.user || { id: 0, firstname: 'Guest' };
  const caregiver = route.params?.caregiver;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#0056b3',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'StockTab') iconName = focused ? 'medkit' : 'medkit-outline';
          else if (route.name === 'HistoryTab') iconName = focused ? 'document-text' : 'document-text-outline';
          else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} initialParams={{ user, caregiver }}  options={{ title: 'หน้าหลัก' }} />
      <Tab.Screen name="StockTab" component={StockScreen} initialParams={{ user, caregiver }} options={{ title: 'คลังยา' }} />
      <Tab.Screen name="HistoryTab" component={HistoryScreen} initialParams={{ user, caregiver }} options={{ title: 'ประวัติ' }} />
      {!caregiver && (
        <Tab.Screen 
          name="ProfileTab" 
          component={ProfileScreen} 
          initialParams={{ user }} 
          options={{ title: 'ตั้งค่า' }} 
        />
      )}
    </Tab.Navigator>
  );
}

export default function App() {
  const navigationRef = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync();

    // ดักจับการกดที่แจ้งเตือน
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const medName = data.medName;
      const scheduleId = data.scheduleId; 

      if (navigationRef.current) {
        navigationRef.current.navigate('Alarm', { 
            medName: medName,
            scheduleId: scheduleId 
        });
      }
    });

    return () => {
      // ✅ แก้ Error ตรงนี้: ใช้ .remove() แทนคำสั่งเก่า
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return;
      }
    }
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={MainTabs} />
        <Stack.Screen name="ManageCaregiver" component={ManageCaregiverScreen} />
        <Stack.Screen name="AddMedication" component={AddMedicationScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="AddSymptom" component={AddSymptomScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="CaregiverHome" component={CaregiverHomeScreen} />
        <Stack.Screen name="CaregiverDashboard" component={CaregiverDashboardScreen} />
        <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
        <Stack.Screen name="AdminUserManagement" component={AdminUserManagementScreen} />
        <Stack.Screen name="AdminMedicationMaster" component={AdminMedicationMasterScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="CaregiverProfile" component={CaregiverProfileScreen} />
        <Stack.Screen name="EditMedication" component={EditMedicationScreen} />
        <Stack.Screen name="MasterSearch" component={MasterSearchScreen} options={{ title: 'ค้นหายา' }} />
        <Stack.Screen
        name="Stock"
        component={StockScreen}
        />
        <Stack.Screen 
          name="Alarm" 
          component={AlarmScreen} 
          options={{ 
            gestureEnabled: false, 
            presentation: 'fullScreenModal' 
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}