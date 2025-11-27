import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { WalletButton } from "../../components/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { apiService, PortfolioToken } from "../../services/api";




interface YourCratesProps {
  onOpenCrate: (crateId: number) => void;
  onBack: () => void;
}

export const YourCrates = ({ onOpenCrate: _onOpenCrate, onBack: _onBack }: YourCratesProps): JSX.Element => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = React.useState<"crate" | "portfolio">(
    "portfolio",
  );
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [portfolioTokens, setPortfolioTokens] = useState<PortfolioToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [selectedCrate, setSelectedCrate] = useState<number | null>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // Helper function to get category image path
  const getCategoryImage = (category?: string): string => {
    if (!category) return '';
    const categoryLower = category.toLowerCase();
    
    // Map category names to image paths
    const categoryImageMap: { [key: string]: string } = {
      'celebrities': '/celebrity.svg',
      'dog-coin': '/dog-coin.svg',
      'politifi': '/politifi.svg',
      'ogmemes': '/dog-coin.svg', // Fallback
      'pepe': '/celebrity.svg', // Fallback
      'animals': '/celebrity.svg', // Fallback
      'food': '/celebrity.svg', // Fallback
      'mixed': '/celebrity.svg', // Fallback
      'music': '/celebrity.svg', // Fallback
    };
    
    return categoryImageMap[categoryLower] || '/celebrity.svg'; // Default fallback
  };

  const fetchWalletData = useCallback(async () => {
    if (!publicKey) return;
    try {
      setWalletLoading(true);
      const response = await apiService.getUserWallet(publicKey.toString());
      console.log("🔍 API Response:", response);
      if (response?.success) {
        setWalletData(response.wallet);
        console.log("✅ Wallet data fetched from wallets.json:", {
          userPublicKey: response.wallet?.userPublicKey,
          tokenCount: response.wallet?.tokenPurchases?.length || 0,
          hasTokenPurchases: !!response.wallet?.tokenPurchases,
          tokenPurchasesType: typeof response.wallet?.tokenPurchases,
          isArray: Array.isArray(response.wallet?.tokenPurchases)
        });
        console.log("Full wallet response:", JSON.stringify(response.wallet, null, 2));
        if (response.wallet?.tokenPurchases) {
          console.log("Token purchases array:", response.wallet.tokenPurchases);
          // Log P&L data for each purchase
          response.wallet.tokenPurchases.forEach((purchase: any, index: number) => {
            console.log(`Purchase ${index + 1} (${purchase.purchaseId}):`, {
              totalInvested: purchase.totalInvested,
              totalCurrentValue: purchase.totalCurrentValue,
              totalPnlValue: purchase.totalPnlValue,
              totalPnlPercent: purchase.totalPnlPercent,
              isPositive: purchase.isPositive,
              hasCompleteTokens: purchase.hasCompleteTokens,
              error: purchase.error,
              tokenCount: purchase.tokens?.length || 0,
              allKeys: Object.keys(purchase)
            });
          });
        }
      } else {
        console.warn("⚠️ No wallet data found for user:", publicKey.toString());
        setWalletData(null);
      }
    } catch (error) {
      console.error("❌ Failed to fetch wallet data from wallets.json:", error);
      setWalletData(null);
    } finally {
      setWalletLoading(false);
    }
  }, [publicKey]);

  // Fetch wallet data when wallet is connected
  useEffect(() => {
    if (publicKey) {
      fetchWalletData();
    }
  }, [publicKey, fetchWalletData]);

  // Fetch wallet data when switching to crate tab
  useEffect(() => {
    if (activeTab === "crate" && publicKey && !walletLoading) {
      fetchWalletData();
    }
  }, [activeTab, publicKey, fetchWalletData, walletLoading]);

  // const fetchPortfolioTokens = useCallback(async () => {
  //   if (!publicKey) {
  //     return;
  //   }

  //   try {
  //     setTokensLoading(true);
  //     const response = await apiService.getPortfolioTokens(publicKey.toString());
  //     if (response?.success) {
  //       setPortfolioTokens(response.tokens || []);
  //     }
  //   } catch (error) {
  //     console.error("Failed to fetch portfolio tokens:", error);
  //     setPortfolioTokens([]); // Set empty array on error
  //   } finally {
  //     setTokensLoading(false);
  //   }
  // }, [publicKey]);

  // useEffect(() => {
  //   if (activeTab === "portfolio" && publicKey) {
  //     fetchPortfolioTokens();
  //   }
  // }, [activeTab, publicKey, fetchPortfolioTokens]);

  // const handleCashOut = (crateId: number) => {
  //   setSelectedCrate(crateId);
  //   navigate("/cash-out", { state: { crateId } });
  // };

  return (
    <div className="bg-[#060606] overflow-hidden w-full min-h-screen flex flex-col">
      <header className="relative w-full flex flex-col lg:flex-row items-center justify-between px-4 sm:px-6 lg:px-[46px] pt-4 sm:pt-6 lg:pt-9 pb-4 sm:pb-6 gap-4 lg:gap-0">
        <div className="w-auto flex items-center gap-2 flex-shrink-0">
          <img src="/memecrate.svg" alt="MEMECRATE" className="h-16" />
          <h1 className="[font-family:'Public_Sans',Helvetica] font-semibold text-[#BBFE03] text-lg sm:text-xl lg:text-[20.1px] tracking-[0] leading-[normal] whitespace-nowrap">
            MEMECRATE
          </h1>
        </div>

        <nav className="relative lg:absolute lg:left-1/2 lg:-translate-x-1/2 inline-flex justify-center p-2.5 bg-[#343434] items-center gap-2.5 rounded-xl">
          <Button
            onClick={() => {
              setActiveTab("crate");
              navigate("/crate");
            }}
            className={`h-auto px-2 sm:px-[7px] py-[3px] ${
              activeTab === "crate" ? "bg-[#d8d8d8]" : "bg-transparent"
            } hover:bg-[#d8d8d8]/90`}
          >
            <span
              className={`[font-family:'Inter',Helvetica] font-medium text-sm sm:text-base tracking-[0] leading-[normal] whitespace-nowrap ${
                activeTab === "crate" ? "text-[#2c2c2c]" : "text-white"
              }`}
            >
              Crate
            </span>
          </Button>

          <Button
            onClick={() => {
              setActiveTab("portfolio");
              navigate("/your-crates");
            }}
            className={`h-auto px-2 sm:px-[7px] py-[3px] ${
              activeTab === "portfolio" ? "bg-[#d8d8d8]" : "bg-transparent"
            } hover:bg-[#d8d8d8]/90`}
          >
            <span
              className={`[font-family:'Inter',Helvetica] font-medium text-sm sm:text-base tracking-[0] leading-[normal] whitespace-nowrap ${
                activeTab === "portfolio" ? "text-[#2c2c2c]" : "text-white"
              }`}
            >
              Portfolio
            </span>
          </Button>
        </nav>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">  
          <WalletButton />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="flex-1 flex flex-col items-center gap-8 sm:gap-12 px-4 sm:px-8 bg-[#0D0D0D] w-[70%] py-4 rounded-3xl border-t border-t-[#C4C4C4] border-b border-b-[#5E5E5E] relative overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[1px] before:bg-gradient-to-b before:from-[#C4C4C4] before:to-[#5E5E5E] before:rounded-tl-3xl before:rounded-bl-3xl after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[1px] after:bg-gradient-to-b after:from-[#C4C4C4] after:to-[#5E5E5E] after:rounded-tr-3xl after:rounded-br-3xl"> 
          <div className="flex flex-col items-center gap-3 sm:gap-4 mb-6">
            <h2 className="[font-family:'Inter',Helvetica] text-2xl sm:text-3xl text-[#BBFE03] lg:text-4xl tracking-[0] leading-[normal] text-center">
              Your Crates
            </h2>
            <p className="[font-family:'Inter',Helvetica] font-normal text-[#bbbbbb] sm:text-lg text-center mt-[-10px]">
              Follow the steps
            </p>
          </div>

          <div className="w-full">
            {walletLoading ? (
              <div className="text-center text-white py-8">Loading wallet data...</div>
            ) : walletData && walletData.tokenPurchases && Array.isArray(walletData.tokenPurchases) && walletData.tokenPurchases.length > 0 ? (
              (() => {
                // Backend now returns grouped format directly with P&L data, but handle both for backward compatibility
                const purchaseGroups = walletData.tokenPurchases.map((item: any) => {
                  // If already in grouped format (has 'tokens' array), preserve all fields including P&L data
                  if (item.tokens && Array.isArray(item.tokens)) {
                    return {
                      purchaseId: item.purchaseId || 'unknown',
                      category: item.category || 'celebrities',
                      tokens: item.tokens,
                      // Preserve P&L data from backend
                      totalInvested: item.totalInvested,
                      totalCurrentValue: item.totalCurrentValue,
                      totalPnlValue: item.totalPnlValue,
                      totalPnlPercent: item.totalPnlPercent,
                      isPositive: item.isPositive,
                      hasCompleteTokens: item.hasCompleteTokens,
                      error: item.error
                    };
                  }
                  // If in flat format (backward compatibility), convert to grouped (no P&L data available)
                  return {
                    purchaseId: item.purchaseId || 'unknown',
                    category: item.category || 'celebrities',
                    tokens: [item],
                    // No P&L data for old format
                    totalInvested: undefined,
                    totalCurrentValue: undefined,
                    totalPnlValue: undefined,
                    totalPnlPercent: undefined,
                    isPositive: undefined,
                    hasCompleteTokens: undefined,
                    error: undefined
                  };
                }).filter((group: any) => group.tokens && group.tokens.length > 0);

                return (
                  <div>
                    <div className="grid grid-cols-3 gap-4 mt-[-60px]">
                      {purchaseGroups.map((group: any, groupIndex: number) => {
                        const totalSol = group.tokens.reduce((sum: number, token: any) => sum + (token.buyAmountSol || 0), 0);
                        const firstToken = group.tokens[0];
                        const tokenCount = group.tokens.length;
                        const displayCategory = group.category || 'celebrities';
                        const categoryImage = getCategoryImage(displayCategory);

                        console.log('🔍 Rendering group:', { 
                          purchaseId: group.purchaseId, 
                          category: displayCategory, 
                          categoryImage, 
                          tokenCount 
                        });

                        // Get P&L data from backend response
                        console.log(`📊 Rendering group ${groupIndex} (${group.purchaseId}):`, {
                          totalPnlPercent: group.totalPnlPercent,
                          totalPnlValue: group.totalPnlValue,
                          totalInvested: group.totalInvested,
                          totalCurrentValue: group.totalCurrentValue,
                          isPositive: group.isPositive,
                          hasCompleteTokens: group.hasCompleteTokens,
                          error: group.error,
                          allKeys: Object.keys(group)
                        });
                        
                        // Check if P&L data exists (might be undefined if calculation failed)
                        const hasPnlData = group.totalPnlPercent !== undefined && group.totalPnlValue !== undefined;
                        
                        if (!hasPnlData && !group.error) {
                          console.warn(`⚠️ No P&L data found for purchase ${group.purchaseId}. This might indicate the calculation is still running or failed silently.`);
                        }
                        
                        const totalPnlPercent = group.totalPnlPercent ?? '0.00';
                        const totalPnlValue = group.totalPnlValue ?? '0.0000';
                        const isPositive = group.isPositive !== undefined ? group.isPositive : (parseFloat(totalPnlValue) >= 0);
                        const pnlPercentFormatted = `${isPositive ? '+' : ''}${totalPnlPercent}%`;
                        const pnlValueFormatted = `${isPositive ? '+' : ''}${parseFloat(totalPnlValue).toFixed(4)} SOL`;

                        return (
                          <div key={`${group.purchaseId}-${groupIndex}`} className="flex flex-col bg-[#181818] p-4 sm:p-6 gap-4 rounded-xl">
                            <div className="flex justify-center">
                              <span className="[font-family:'Inter',Helvetica] font-normal text-[#BBFE03] border border-solid border-[#BBFE03] px-8 py-1 rounded-3xl text-xs sm:text-sm tracking-[0] leading-[normal] mt-[-10px]">
                                {displayCategory.toUpperCase()}
                              </span>
                            </div>
                            
                            {/* P&L Display */}
                            <div className="flex flex-col items-center gap-2 mt-[-10px]">
                              <div className="flex items-center gap-2">
                                <span className={`[font-family:'Inter',Helvetica] font-semibold text-sm sm:text-base tracking-[0] leading-[normal] ${
                                  isPositive ? 'text-[#BBFE03]' : 'text-[#FE4A03]'
                                }`}>
                                  {pnlPercentFormatted}
                                </span>
                                
                              </div>
                            </div>
                            <div className="w-full aspect-square flex items-center justify-center mt-[-10px] overflow-hidden relative rounded-lg">
                              {categoryImage ? (
                                <img 
                                  src={categoryImage} 
                                  alt={displayCategory} 
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    console.error('❌ Image load error for:', categoryImage);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                  onLoad={() => {
                                    console.log('✅ Image loaded successfully:', categoryImage);
                                  }}
                                />
                              ) : (
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#BBFE03]">
                                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                                  <rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
                                </svg>
                              )}                              
                            </div>
                            <p className="[font-family:'Inter',Helvetica] font-normal text-[#A5A5A5] text-sm sm:text-base tracking-[0] leading-[normal] text-center">
                              Profit Since Crafting
                            </p>
                            <div className="flex flex-col items-center gap-2 mt-[-10px]">
                              <div className="flex items-center gap-2">
                                <img src={isPositive ? "/top.svg" : "/down.svg"} alt={isPositive ? "Profit" : "Loss"} className="w-4 h-4" />
                                
                                <span className={`[font-family:'Inter',Helvetica] font-semibold text-sm sm:text-base tracking-[0] leading-[normal] ${
                                  isPositive ? 'text-[#BBFE03]' : 'text-[#FE4A03]'
                                }`}>
                                  {pnlValueFormatted}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                navigate("/cash-out", {
                                  state: {
                                    purchaseId: group.purchaseId,
                                    category: group.category,
                                    tokens: group.tokens,
                                    totalSol: totalSol
                                  }
                                });
                              }}
                              className="px-8 bg-[#BBFE03] py-3 rounded-xl font-bold hover:bg-[#BBFE03]/90 transition-colors cursor-pointer"
                            >
                              Cashout
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center text-[#bbbbbb] py-8">
                <p>No token purchases found</p>
                <p className="text-sm mt-2">Tokens will appear here after you create a crate</p>                
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
