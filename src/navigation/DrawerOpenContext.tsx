import React, { createContext, useContext, useState, useCallback } from 'react';

export type DrawerOpenContextValue = {
  isOpen: boolean;
  isAvailable: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const DrawerOpenContext = createContext<DrawerOpenContextValue | null>(null);

export function DrawerOpenProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  return (
    <DrawerOpenContext.Provider value={{ isOpen, isAvailable: true, openDrawer, closeDrawer }}>
      {children}
    </DrawerOpenContext.Provider>
  );
}

const noop: DrawerOpenContextValue = {
  isOpen: false,
  isAvailable: false,
  openDrawer: () => {},
  closeDrawer: () => {},
};

export function useDrawerOpen(): DrawerOpenContextValue {
  const ctx = useContext(DrawerOpenContext);
  return ctx ?? noop;
}
