import React, { createContext, useContext, useState } from "react";

interface SelectedCoinsContextValue {
  selectedCoins: string;
  setSelectedCoins: (value: string) => void;
}

const SelectedCoinsContext = createContext<SelectedCoinsContextValue | undefined>(undefined);

export const SelectedCoinsProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [selectedCoins, setSelectedCoins] = useState<string>("4");

  return (
    <SelectedCoinsContext.Provider value={{ selectedCoins, setSelectedCoins }}>
      {children}
    </SelectedCoinsContext.Provider>
  );
};

export const useSelectedCoins = (): SelectedCoinsContextValue => {
  const ctx = useContext(SelectedCoinsContext);
  if (!ctx) throw new Error("useSelectedCoins must be used within SelectedCoinsProvider");
  return ctx;
};

