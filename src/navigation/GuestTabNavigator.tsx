import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import BoutiqueScreen from '../screens/BoutiqueScreen';

const Tab = createBottomTabNavigator();

export default function GuestTabNavigator() {
  const { colors, isDarkMode } = useTheme();
  
  const tabBarBackgroundColor = isDarkMode ? '#2A2A2A' : '#E5E5E5';
  const tabBarActiveColor = '#D4AF37';
  const tabBarInactiveColor = isDarkMode ? '#FFFFFF' : '#000000';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          height: Platform.OS === 'ios' ? 75 : 70,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          borderRadius: 35,
          marginHorizontal: 16,
          marginBottom: Platform.OS === 'ios' ? 20 : 20,
          position: 'absolute',
          elevation: 0,
          shadowOpacity: 0,
          borderTopWidth: 3,
          borderTopColor: tabBarActiveColor,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          borderBottomWidth: 0,
        },
        tabBarActiveTintColor: tabBarActiveColor,
        tabBarInactiveTintColor: tabBarInactiveColor,
        tabBarShowLabel: false,
      }}
    >
      {/* Only Boutique tab for guests */}
      <Tab.Screen
        name="Boutique"
        component={BoutiqueScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name="store-outline"
              size={26}
              color={focused ? tabBarActiveColor : tabBarInactiveColor}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}












