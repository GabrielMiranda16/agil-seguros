import React, { createContext, useContext } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const [selectedCompanyId, setSelectedCompanyId] = useLocalStorage('selectedCompanyId', null);

  const value = {
    selectedCompanyId,
    setSelectedCompanyId,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};