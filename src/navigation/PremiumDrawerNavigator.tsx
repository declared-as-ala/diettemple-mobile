/**
 * Stack-based "drawer" with custom slide-in panel.
 * Screens: Main (tabs), Exercises, Recipes, WeekPlan, Gallery, DayGalleryDetails.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerOpenProvider } from './DrawerOpenContext';
import { StackRefProvider } from './StackRefContext';
import DrawerPanel from './DrawerPanel';
import AuthenticatedTabNavigator from './AuthenticatedTabNavigator';
import ExercisesScreen from '../screens/ExercisesScreen';
import RecipesScreen from '../screens/RecipesScreen';
import WeekPlanScreen from '../screens/WeekPlanScreen';
import GalleryScreen from '../screens/GalleryScreen';
import DayGalleryDetailsScreen from '../screens/DayGalleryDetailsScreen';
import { useStackRef } from './StackRefContext';

export type PremiumDrawerParamList = {
  Main: undefined;
  Exercises: undefined;
  Recipes: undefined;
  WeekPlan: { weekNumber?: number } | undefined;
  Gallery: undefined;
  DayGalleryDetails: { date: string };
};

const Stack = createStackNavigator<PremiumDrawerParamList>();

function withStackRef<P extends object>(Component: React.ComponentType<P>, routeName: string) {
  return function Wrapped(props: P & { navigation?: any; route?: any }) {
    const { setNavigation, setCurrentRouteName } = useStackRef();
    useEffect(() => {
      if (props.navigation) setNavigation(props.navigation);
      setCurrentRouteName(routeName);
    }, [props.navigation, setNavigation, setCurrentRouteName]);
    return <Component {...(props as P)} />;
  };
}

const MainScreen = withStackRef(() => <AuthenticatedTabNavigator />, 'Main');
const ExercisesScreenWrapped = withStackRef(ExercisesScreen, 'Exercises');
const RecipesScreenWrapped = withStackRef(RecipesScreen, 'Recipes');
const WeekPlanScreenWrapped = withStackRef(WeekPlanScreen, 'WeekPlan');
const GalleryScreenWrapped = withStackRef(GalleryScreen, 'Gallery');
const DayGalleryDetailsScreenWrapped = withStackRef(DayGalleryDetailsScreen, 'DayGalleryDetails');

export default function PremiumDrawerNavigator() {
  return (
    <DrawerOpenProvider>
      <StackRefProvider>
        <View style={styles.container}>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Main">
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen name="Exercises" component={ExercisesScreenWrapped} />
            <Stack.Screen name="Recipes" component={RecipesScreenWrapped} />
            <Stack.Screen name="WeekPlan" component={WeekPlanScreenWrapped} initialParams={{ weekNumber: 1 }} />
            <Stack.Screen name="Gallery" component={GalleryScreenWrapped} />
            <Stack.Screen name="DayGalleryDetails" component={DayGalleryDetailsScreenWrapped} />
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
