import React from 'react';
import { useAuthStore } from '../store/authStore';

// Use require to get the actual module and extract default
const AuthenticatedTabNavigatorModule = require('./AuthenticatedTabNavigator');
const GuestTabNavigatorModule = require('./GuestTabNavigator');

// Extract default export - handle both CommonJS and ES6 modules
const AuthenticatedTabNavigator = 
  AuthenticatedTabNavigatorModule?.default || 
  AuthenticatedTabNavigatorModule;
  
const GuestTabNavigator = 
  GuestTabNavigatorModule?.default || 
  GuestTabNavigatorModule;

// Verify they are functions
if (typeof AuthenticatedTabNavigator !== 'function') {
  console.error('AuthenticatedTabNavigator is not a function:', typeof AuthenticatedTabNavigator);
}
if (typeof GuestTabNavigator !== 'function') {
  console.error('GuestTabNavigator is not a function:', typeof GuestTabNavigator);
}

export default function HomeNavigator() {
  const { token } = useAuthStore();
  
  if (token) {
    if (typeof AuthenticatedTabNavigator === 'function') {
      return React.createElement(AuthenticatedTabNavigator);
    }
    console.error('Cannot render AuthenticatedTabNavigator - not a function. Type:', typeof AuthenticatedTabNavigator, 'Value:', AuthenticatedTabNavigator);
    return null;
  }
  
  if (typeof GuestTabNavigator === 'function') {
    return React.createElement(GuestTabNavigator);
  }
  console.error('Cannot render GuestTabNavigator - not a function. Type:', typeof GuestTabNavigator, 'Value:', GuestTabNavigator);
  return null;
}

