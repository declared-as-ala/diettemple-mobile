import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types';

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

export function getRootNavigation() {
  return rootNavigationRef.isReady() ? rootNavigationRef : null;
}
