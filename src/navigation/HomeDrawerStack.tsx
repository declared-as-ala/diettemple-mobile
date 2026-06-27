/**
 * Drawer + Stack for the Home tab only.
 * Drawer (hamburger) is available only when this stack is mounted (Home tab active).
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerOpenProvider } from './DrawerOpenContext';
import { StackRefProvider, useStackRef } from './StackRefContext';
import DrawerPanel from './DrawerPanel';
import HomeDashboardScreen from '../screens/HomeDashboardScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import RecettesScreen from '../screens/RecettesScreen';
import WeekPlanScreen from '../screens/WeekPlanScreen';
import GalleryScreen from '../screens/GalleryScreen';
import DayGalleryDetailsScreen from '../screens/DayGalleryDetailsScreen';
import GalleryCompareScreen from '../screens/GalleryCompareScreen';

export type HomeDrawerParamList = {
  Main: undefined;
  Exercises: undefined;
  Recipes: undefined;
  WeekPlan: { weekNumber?: number } | undefined;
  Gallery: undefined;
  GalleryCompare: { dateA?: string; dateB?: string } | undefined;
  DayGalleryDetails: { date: string };
};

const Stack = createStackNavigator<HomeDrawerParamList>();

function withStackRef<P extends object>(Component: React.ComponentType<P>, routeName: keyof HomeDrawerParamList) {
  return function Wrapped(props: P & { navigation?: any; route?: any }) {
    const { setNavigation, setCurrentRouteName } = useStackRef();
    useEffect(() => {
      if (props.navigation) setNavigation(props.navigation);
      setCurrentRouteName(routeName as string);
    }, [props.navigation, setNavigation, setCurrentRouteName]);
    return <Component {...(props as P)} />;
  };
}

const MainScreen = withStackRef(() => <HomeDashboardScreen />, 'Main');
const ExercisesWrapped = withStackRef(ExercisesScreen, 'Exercises');
const RecettesWrapped = withStackRef(RecettesScreen, 'Recipes');
const WeekPlanWrapped = withStackRef(WeekPlanScreen, 'WeekPlan');
const GalleryWrapped = withStackRef(GalleryScreen, 'Gallery');
const DayGalleryDetailsWrapped = withStackRef(DayGalleryDetailsScreen, 'DayGalleryDetails');
const GalleryCompareWrapped = withStackRef(GalleryCompareScreen, 'GalleryCompare');

export default function HomeDrawerStack() {
  return (
    <DrawerOpenProvider>
      <StackRefProvider>
        <View style={styles.container}>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Main">
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="Exercises" component={ExercisesWrapped} />
            <Stack.Screen name="Recipes" component={RecettesWrapped} />
            <Stack.Screen name="WeekPlan" component={WeekPlanWrapped} initialParams={{ weekNumber: 1 }} />
            <Stack.Screen name="Gallery" component={GalleryWrapped} />
            <Stack.Screen name="GalleryCompare" component={GalleryCompareWrapped} />
            <Stack.Screen name="DayGalleryDetails" component={DayGalleryDetailsWrapped} />
          </Stack.Navigator>
          <DrawerPanel />
        </View>
      </StackRefProvider>
    </DrawerOpenProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
