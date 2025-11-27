import React, { createContext, useContext, useState } from "react";
import { Category } from "../services/api";

export interface CategoryInfo {
  name: string;
  image: string;
  contractTheme?: string; // Optional: contract theme for backend
}

interface SelectedCategoryContextValue {
  selectedCategory: CategoryInfo | null;
  setSelectedCategory: (cat: CategoryInfo | null) => void;
  lastSelectedAt: number | null;
}

const SelectedCategoryContext = createContext<SelectedCategoryContextValue | undefined>(undefined);

export const SelectedCategoryProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryInfo | null>(null);
  const [lastSelectedAt, setLastSelectedAt] = useState<number | null>(null);

  const handleSetSelectedCategory = (cat: CategoryInfo | null) => {
    setSelectedCategory(cat);
    if (cat) {
      setLastSelectedAt(Date.now());
    }
  };

  return (
    <SelectedCategoryContext.Provider value={{ selectedCategory, setSelectedCategory: handleSetSelectedCategory, lastSelectedAt }}>
      {children}
    </SelectedCategoryContext.Provider>
  );
};

export const useSelectedCategory = (): SelectedCategoryContextValue => {
  const ctx = useContext(SelectedCategoryContext);
  if (!ctx) throw new Error("useSelectedCategory must be used within SelectedCategoryProvider");
  return ctx;
};


