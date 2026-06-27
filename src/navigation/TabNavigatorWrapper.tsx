import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';

// Handle the import - try to get the actual function component
const getComponent = (module: any) => {
  if (typeof module === 'function') return module;
  if (module?.default && typeof module.default === 'function') return module.default;
  return module;
};

const LoadingFallback = () => <View style={{ flex: 1, backgroundColor: '#000000' }} />;

function AuthenticatedContent() {
  const token = useAuthStore((s) => s.token);
  const isLoading = useSubscriptionStore((s) => s.isLoading);
  const bootSubscription = useSubscriptionStore((s) => s.bootSubscription);
  const clear = useSubscriptionStore((s) => s.clear);

  // Boot subscription when token becomes available; clear when lost
  useEffect(() => {
    if (token) {
      bootSubscription().catch(() => {});
    } else {
      clear();
    }
  }, [token, bootSubscription, clear]);

  if (isLoading) return <LoadingFallback />;
  const AuthenticatedTabNavigator = getComponent(require('./AuthenticatedTabNavigator').default);
  return <AuthenticatedTabNavigator />;
}

function TabNavigatorWrapper() {
  const { token, isLoading } = useAuthStore();

  if (isLoading) return <LoadingFallback />;

  if (token) {
    return <AuthenticatedContent />;
  }

  const GuestTabNavigator = getComponent(require('./GuestTabNavigator').default);
  return typeof GuestTabNavigator === 'function' ? <GuestTabNavigator /> : <LoadingFallback />;
}

export default TabNavigatorWrapper;
