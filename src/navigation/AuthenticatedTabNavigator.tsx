import { BRAND_YELLOW } from '../constants/brand';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Dimensions, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import HomeDrawerStack from './HomeDrawerStack';
import BoutiqueScreen from '../screens/BoutiqueScreen';
import NutritionScreen from '../screens/NutritionScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

function AuthenticatedTabNavigator() {
  const { colors, isDarkMode } = useTheme();
  
  const tabBarBackgroundColor = isDarkMode ? '#2A2A2A' : '#E5E5E5';
  const tabBarActiveColor = BRAND_YELLOW;
  const tabBarInactiveColor = isDarkMode ? '#FFFFFF' : '#000000';

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <Tab.Navigator
      safeAreaInsets={{ bottom: 0 }}
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          borderRadius: 35,
          marginHorizontal: 16,
          marginBottom: 16,
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
      <Tab.Screen
        name="Food"
        component={NutritionScreen}
        options={{
          tabBarLabel: 'Nutrition',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="nutrition-outline"
              size={26}
              color={focused ? tabBarActiveColor : tabBarInactiveColor}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Home"
        component={HomeDrawerStack}
        options={{
          tabBarIcon: ({ focused }) => {
            if (focused) {
              return (
                <View style={styles.middleTabContainer}>
                  <View style={styles.middleTabCircle}>
                    <MaterialIcons
                      name="home"
                      size={28}
                      color="#000000"
                    />
                  </View>
                </View>
              );
            }
            return (
              <View style={styles.middleTabContainer}>
                <MaterialIcons
                  name="home"
                  size={26}
                  color={tabBarInactiveColor}
                />
              </View>
            );
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="person-outline"
              size={26}
              color={focused ? tabBarActiveColor : tabBarInactiveColor}
            />
          ),
        }}
      />
    </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  middleTabContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleTabCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_YELLOW,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: BRAND_YELLOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default AuthenticatedTabNavigator;







