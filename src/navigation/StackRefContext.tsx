import React, { createContext, useContext, useRef, useCallback, useState } from 'react';

type StackRefContextValue = {
  setNavigation: (nav: any) => void;
  setCurrentRouteName: (name: string) => void;
  getNavigation: () => any;
  getCurrentRouteName: () => string;
};

const StackRefContext = createContext<StackRefContextValue | null>(null);

export function StackRefProvider({ children }: { children: React.ReactNode }) {
  const navRef = useRef<any>(null);
  const [routeName, setCurrentRouteName] = useState('Main');
  const setNavigation = useCallback((nav: any) => {
    navRef.current = nav;
  }, []);
  const getNavigation = useCallback(() => navRef.current, []);
  const getCurrentRouteName = useCallback(() => routeName, [routeName]);
  return (
    <StackRefContext.Provider value={{ setNavigation, setCurrentRouteName, getNavigation, getCurrentRouteName }}>
      {children}
    </StackRefContext.Provider>
  );
}

export function useStackRef(): StackRefContextValue {
  const ctx = useContext(StackRefContext);
  if (!ctx) throw new Error('useStackRef must be used within StackRefProvider');
  return ctx;
}
