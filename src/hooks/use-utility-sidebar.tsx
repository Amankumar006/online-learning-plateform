
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type PanelType = 'chat' | 'tasks' | 'math' | 'notes' | null;

interface UtilitySidebarContextType {
  openPanel: PanelType;
  togglePanel: (panel: PanelType) => void;
}

const UtilitySidebarContext = createContext<UtilitySidebarContextType | undefined>(undefined);

export const UtilitySidebarProvider = ({ children }: { children: ReactNode }) => {
  const [openPanel, setOpenPanel] = useState<PanelType>(null);

  const togglePanel = (panel: PanelType) => {
    setOpenPanel(prevPanel => (prevPanel === panel ? null : panel));
  };

  return (
    <UtilitySidebarContext.Provider value={{ openPanel, togglePanel }}>
      {children}
    </UtilitySidebarContext.Provider>
  );
};

export const useUtilitySidebar = () => {
  const context = useContext(UtilitySidebarContext);
  if (context === undefined) {
    throw new Error('useUtilitySidebar must be used within a UtilitySidebarProvider');
  }
  return context;
};
