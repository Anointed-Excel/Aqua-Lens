import React from 'react';
import { View, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

import SplashScreen         from '../screens/SplashScreen';
import OnboardingScreen     from '../screens/OnboardingScreen';
import LoginScreen          from '../screens/LoginScreen';
import RegisterScreen       from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import VerifyOTPScreen      from '../screens/VerifyOTPScreen';
import HomeScreen           from '../screens/HomeScreen';
import ResultScreen         from '../screens/ResultScreen';
import FishDetailScreen     from '../screens/FishDetailScreen';
import ManualEntryScreen    from '../screens/ManualEntryScreen';
import ExploreScreen        from '../screens/ExploreScreen';
import HistoryScreen        from '../screens/HistoryScreen';
import ProfileScreen        from '../screens/ProfileScreen';
import MapScreen            from '../screens/MapScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_CONFIG = {
  Scan:    { icon: 'aperture' },
  Explore: { icon: 'compass' },
  History: { icon: 'clock' },
  Profile: { icon: 'user' },
};

function MainTabs() {
  const { theme: t } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <Feather
            name={TAB_CONFIG[route.name].icon}
            size={22}
            color={color}
          />
        ),
        tabBarActiveTintColor: t.tabActive,
        tabBarInactiveTintColor: t.tabInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: t.tabBar,
          borderTopColor: t.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        },
        tabBarItemStyle: { paddingVertical: 2 },
      })}
    >
      <Tab.Screen name="Scan"    component={ScanStack} />
      <Tab.Screen name="Explore" component={ExploreStack} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

function sharedDetailScreens(Stack, t) {
  const headerStyle = {
    backgroundColor: t.header,
    borderBottomColor: t.border,
    borderBottomWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  };
  return [
    <Stack.Screen
      key="FishDetail"
      name="FishDetail"
      component={FishDetailScreen}
      options={{
        title: 'Fish Details',
        headerStyle,
        headerTintColor: t.primary,
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: t.headerText },
        headerShown: true,
      }}
    />,
    <Stack.Screen
      key="ManualEntry"
      name="ManualEntry"
      component={ManualEntryScreen}
      options={{
        title: 'Add Fish',
        headerStyle,
        headerTintColor: t.primary,
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: t.headerText },
        headerShown: true,
      }}
    />,
  ];
}

function ScanStack() {
  const { theme: t } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{
          headerShown: true,
          title: 'Scan Result',
          headerStyle: { backgroundColor: t.bg, borderBottomColor: t.border, borderBottomWidth: 1, elevation: 0, shadowOpacity: 0 },
          headerTintColor: t.primary,
          headerTitleStyle: { fontWeight: '800', color: t.text },
        }}
      />
      {sharedDetailScreens(Stack, t)}
    </Stack.Navigator>
  );
}

function ExploreStack() {
  const { theme: t } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Explore" component={ExploreScreen} />
      {sharedDetailScreens(Stack, t)}
    </Stack.Navigator>
  );
}

function ProfileStack() {
  const { theme: t } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      {sharedDetailScreens(Stack, t)}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash"         component={SplashScreen} />
        <Stack.Screen name="Onboarding"     component={OnboardingScreen} />
        <Stack.Screen name="Login"          component={LoginScreen} />
        <Stack.Screen name="Register"       component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="VerifyOTP"      component={VerifyOTPScreen} />
        <Stack.Screen name="Main"           component={MainTabs} />
        <Stack.Screen name="Map"            component={MapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
