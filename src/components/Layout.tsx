import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Element } from "../screens/Element";
import { PickCategory } from "../screens/PickCategory";
import { SuccessRedeem } from "../screens/SuccessRedeem";
import { SelectedCategoryProvider, useSelectedCategory } from "../context/SelectedCategoryContext";
import { SelectedCoinsProvider } from "../context/SelectedCoinsContext";
import { useGameFlow } from "../context/GameFlowContext";
import { Loading } from "./Loading";

const LayoutInner = (): JSX.Element => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const showPickCategory = location.pathname === "/pick-category";
  const showSuccessRedeem = location.pathname === "/success-redeem";
  const { setSelectedCategory } = useSelectedCategory();
  const { transactionSignature } = useGameFlow();
  
  // Get transaction data from location state
  const successData = location.state || {};

  // Initial page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Show loading for 500ms on initial load
    return () => clearTimeout(timer);
  }, []);

  // Page transition loading (subtle, doesn't block UI)
  useEffect(() => {
    setIsPageTransitioning(true);
    const timer = setTimeout(() => {
      setIsPageTransitioning(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Helper function to get category image path
  const getCategoryImage = (category?: string): string => {
    if (!category) return '/frame-3.png';
    const categoryLower = category.toLowerCase();
    if (categoryLower === 'celebrities') {
      return '/celebrity.svg';
    } else if (categoryLower === 'dog-coin') {
      return '/dog-coin.svg';
    } else if (categoryLower === 'politifi') {
      return '/politifi.svg';
    }
    return '/frame-3.png';
  };

  // Get category image from category name or use provided categoryImage
  const categoryImage = successData.categoryImage || getCategoryImage(successData.category);
  const categoryName = successData.categoryName || (successData.category ? successData.category.toUpperCase() : 'PolitiFi');

  if (isLoading) {
    return <Loading fullScreen={true} size="lg" />;
  }

  return (
    <>
      {isPageTransitioning && (
        <div className="fixed inset-0 bg-[#060606]/80 backdrop-blur-sm flex items-center justify-center z-40 pointer-events-none">
          <Loading size="md" />
        </div>
      )}
      <Element />
      {showPickCategory && (
        <PickCategory
          onSelectCategory={(category) => {
            setSelectedCategory(category);
            window.history.back();
          }}
          onBack={() => window.history.back()}
        />
      )}
      {showSuccessRedeem && (
        <SuccessRedeem
          initialInvestment={successData.initialInvestment || "0.110 SOL"}
          finalValue={successData.finalValue || "0.139 SOL"}
          totalReturn={successData.totalReturn || "+0.029 SOL"}
          totalReturnPercent={successData.totalReturnPercent || "+26 %"}
          exitFee={successData.exitFee || "-0.00139 SOL"}
          finalPayout={successData.finalPayout || "0.138 SOL"}
          categoryName={categoryName}
          categoryImage={categoryImage}
          onBackToHome={() => {
            window.history.back();
          }}
          onViewTransaction={() => {
            const sig = transactionSignature || successData.transactionSignature;
            if (sig) {
              window.open(`https://solscan.io/tx/${sig}`, "_blank");
            } else {
              window.open("https://solscan.io", "_blank");
            }
          }}
        />
      )}
    </>
  );
};

export const Layout = (): JSX.Element => {
  return (
    <SelectedCategoryProvider>
      <SelectedCoinsProvider>
        <LayoutInner />
      </SelectedCoinsProvider>
    </SelectedCategoryProvider>
  );
};
