import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { WalletButton } from "../../components/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { apiService } from "../../services/api";
import { SuccessRedeem } from "../SuccessRedeem";
import { Loading } from "../../components/Loading";

// Token interface for display
interface TokenDisplay {
  name: string;
  invested: string;
  currentValue: string;
  pnl: string;
  isPositive: boolean;
}

interface CashOutProps {
  onConfirm: () => void;
  onBack: () => void;
}

export const CashOut = ({ onConfirm, onBack: _onBack }: CashOutProps): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { publicKey } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"crate" | "portfolio">(
    "portfolio",
  );
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [purchaseCategory, setPurchaseCategory] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenDisplay[]>([]);
  const [totalSol, setTotalSol] = useState<number>(0);
  const [initialInvestment, setInitialInvestment] = useState<number>(0); // initialInvestment from wallets.json
  const [tokensLoading, setTokensLoading] = useState(false);
  // Pre-calculated P&L values from backend (for consistency with YourCrates)
  const [preCalculatedPnl, setPreCalculatedPnl] = useState<{
    totalPnlPercent?: string;
    totalPnlValue?: string;
    totalInvested?: string;
    totalCurrentValue?: string;
    isPositive?: boolean;
  } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    initialInvestment: string;
    finalValue: string;
    totalReturn: string;
    totalReturnPercent: string;
    exitFee: string;
    finalPayout: string;
    transactionSignature: string | null;
    category: string | null;
  } | null>(null);

  // Helper function to get category image path
  const getCategoryImage = (category?: string): string => {
    if (!category) return '';
    const categoryLower = category.toLowerCase();
    if (categoryLower === 'celebrities') {
      return '/celebrity.svg';
    } else if (categoryLower === 'dog-coin') {
      return '/dog-coin.svg';
    } else if (categoryLower === 'politifi') {
      return '/politifi.svg';
    } else if (categoryLower === 'music') {
      return '/dog-coin.svg';
    } else if (categoryLower === 'sports') {
      return '/sports.svg';
    } else if (categoryLower === 'gaming') {
      return '/politifi.svg';
    } else if (categoryLower === 'food') {
      return '/celebrity.svg';
    } else if (categoryLower === 'mixed') {
      return '/mixed.svg';
    } else if (categoryLower === 'animals') {
      return '/animals.svg';
    } else if (categoryLower === 'pepe') {
      return '/pepe.svg';
    } else if (categoryLower === 'ogmemes') {
      return '/dog-coin.svg'
    }
    return '';
  };

  // Get purchase data from location state, URL params, or redirect
  useEffect(() => {
    // Priority 1: Get purchaseId from location state (from YourCrates navigation)
    // Priority 2: Get purchaseId from URL query params (fallback for refresh)
    const statePurchaseId = location.state?.purchaseId;
    const urlPurchaseId = searchParams.get('purchaseId');
    const finalPurchaseId = statePurchaseId || urlPurchaseId;
    
    if (finalPurchaseId) {
      setPurchaseId(finalPurchaseId);
      // If purchaseId came from state but not in URL, add it to URL for persistence
      if (statePurchaseId && !urlPurchaseId) {
        // Add purchaseId to URL for persistence (without replacing state)
        const newUrl = `/cash-out?purchaseId=${statePurchaseId}`;
        window.history.replaceState(location.state, '', newUrl);
      }
    } else {
      // No purchaseId found - redirect to YourCrates
      console.warn('⚠️ CashOut opened without purchaseId. Redirecting to YourCrates...');
      navigate("/your-crates", { replace: true });
      return;
    }
    
    // Get category and tokens from location state (from YourCrates navigation)
    if (location.state?.category) {
      setPurchaseCategory(location.state.category);
    }
    // Get totalSol from location state
    if (location.state?.totalSol) {
      setTotalSol(location.state.totalSol);
    }
    // Get pre-calculated P&L values from backend (for consistency)
    if (location.state?.totalPnlPercent !== undefined) {
      setPreCalculatedPnl({
        totalPnlPercent: location.state.totalPnlPercent,
        totalPnlValue: location.state.totalPnlValue,
        totalInvested: location.state.totalInvested,
        totalCurrentValue: location.state.totalCurrentValue,
        isPositive: location.state.isPositive
      });
    }
  }, [location, searchParams, navigate]);

  // Fetch user portfolio data and tokens P&L from backend
  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!publicKey) {
        setTokens([]);
        return;
      }

      setTokensLoading(true);

      try {
        // Step 1: Fetch user portfolio from user-portfolio collection in MongoDB
        const walletResult = await apiService.getUserWallet(publicKey.toString());
        
        if (!walletResult.success || !walletResult.wallet?.tokenPurchases) {
          console.error('Failed to fetch user portfolio:', walletResult);
          setTokens([]);
          setInitialInvestment(0);
          return;
        }

        const allPurchases = walletResult.wallet.tokenPurchases;

        // Step 2: Require purchaseId and show only that specific purchase
        if (!purchaseId) {
          console.warn('⚠️ CashOut opened without purchaseId. No tokens will be displayed.');
          setTokens([]);
          setInitialInvestment(0);
          return;
        }

        const purchaseGroup = allPurchases.find(
          (purchase: any) => purchase.purchaseId === purchaseId
        );

        if (!purchaseGroup) {
          console.error(`Purchase group not found for purchaseId: ${purchaseId}`);
          setTokens([]);
          setInitialInvestment(0);
          return;
        }

        // Debug: Log purchase group data
        console.log(`📦 Purchase group found for purchaseId: ${purchaseId}`, {
          category: purchaseGroup.category,
          initialInvestment: purchaseGroup.initialInvestment,
          tokenCount: purchaseGroup.tokens?.length || 0,
          tokens: purchaseGroup.tokens?.map((t: any) => ({
            name: t.tokenName,
            buyAmountSol: t.buyAmountSol,
            tokenAmount: t.tokenAmount,
            mintAddress: t.mintAddress
          }))
        });

        // Extract initialInvestment and category from purchase group
        if (purchaseGroup.initialInvestment !== undefined) {
          setInitialInvestment(parseFloat(purchaseGroup.initialInvestment.toString()) || 0);
          console.log(`✅ Loaded initialInvestment from user-portfolio: ${purchaseGroup.initialInvestment} SOL`);
        } else {
          const calculatedInvestment = purchaseGroup.tokens?.reduce((sum: number, token: any) => {
            return sum + (token.buyAmountSol || 0);
          }, 0) || 0;
          setInitialInvestment(calculatedInvestment || 0);
          console.warn(`⚠️ initialInvestment not found for purchaseId ${purchaseId}, using calculated value: ${calculatedInvestment} SOL`);
        }

        // Set category from purchase group if available
        if (purchaseGroup.category && !purchaseCategory) {
          setPurchaseCategory(purchaseGroup.category);
        }

        // Fetch individual token P&L data for this purchase
        const pnlResult = await apiService.getTokensPnl(purchaseId);
        console.log(`📊 P&L API response for purchaseId ${purchaseId}:`, {
          success: pnlResult.success,
          tokenCount: pnlResult.tokens?.length || 0,
          tokens: pnlResult.tokens
        });
        
        if (pnlResult.success && pnlResult.tokens && pnlResult.tokens.length > 0) {
          // Merge DB data (source of truth for name & invested) with P&L data from API
          const displayTokens: TokenDisplay[] = (purchaseGroup.tokens || []).map((dbToken: any) => {
            const investedNumber = dbToken.buyAmountSol || 0;
            const investedFormatted = investedNumber.toFixed(4);

            // Try to find matching P&L entry by mintAddress, fallback to tokenName
            const pnlToken = pnlResult.tokens!.find((t: any) => 
              (t.mintAddress && dbToken.mintAddress && t.mintAddress === dbToken.mintAddress) ||
              (t.tokenName && dbToken.tokenName && t.tokenName === dbToken.tokenName)
            );

            return {
              name: dbToken.tokenName || 'Unknown Token',
              invested: investedFormatted,
              currentValue: pnlToken?.currentValue || '0.0000',
              pnl: pnlToken?.pnl || 'N/A',
              isPositive: pnlToken?.isPositive ?? false
            };
          });

          setTokens(displayTokens);
          console.log(`✅ Loaded ${displayTokens.length} tokens with P&L data for purchaseId: ${purchaseId}`);
        } else {
          // Fallback: Use tokens directly from user-portfolio (at least show the data we have)
          console.warn('⚠️ P&L calculation failed or returned empty, using tokens from user-portfolio directly');
          if (purchaseGroup.tokens && Array.isArray(purchaseGroup.tokens) && purchaseGroup.tokens.length > 0) {
            const displayTokens: TokenDisplay[] = purchaseGroup.tokens.map((token: any) => {
              const invested = token.buyAmountSol || 0;
              console.log(`📝 Token from user-portfolio:`, {
                tokenName: token.tokenName,
                buyAmountSol: token.buyAmountSol,
                mintAddress: token.mintAddress,
                tokenAmount: token.tokenAmount
              });
              return {
                name: token.tokenName || 'Unknown Token',
                invested: invested > 0 ? invested.toFixed(4) : '0.0000',
                currentValue: '0.0000', // P&L calculation failed, can't determine current value
                pnl: 'N/A',
                isPositive: false
              };
            });
            setTokens(displayTokens);
            console.log(`⚠️ Using ${displayTokens.length} tokens from user-portfolio (no P&L data available)`);
          } else {
            console.error('❌ No tokens found in purchaseGroup.tokens');
            setTokens([]);
          }
        }
      } catch (error: any) {
        console.error('Error fetching portfolio data:', error);
        // Fallback to location state tokens if available
        if (location.state?.tokens && Array.isArray(location.state.tokens)) {
          const displayTokens: TokenDisplay[] = location.state.tokens.map((token: any) => {
            const invested = token.buyAmountSol || 0;
            const currentValue = invested * 1.3; // Placeholder fallback
            const pnlValue = currentValue - invested;
            const pnlPercent = ((pnlValue / invested) * 100).toFixed(2);
            const isPositive = pnlValue >= 0;
            
            return {
              name: token.tokenName || 'Unknown Token',
              invested: invested.toFixed(4),
              currentValue: currentValue.toFixed(4),
              pnl: `${isPositive ? '+' : ''}${pnlPercent}%`,
              isPositive: isPositive
            };
          });
          setTokens(displayTokens);
        } else {
          setTokens([]);
        }
        setInitialInvestment(totalSol || 0);
      } finally {
        setTokensLoading(false);
      }
    };

    fetchPortfolioData();
  }, [purchaseId, location.state, publicKey, totalSol, purchaseCategory]);

  const handleConfirmCashOut = async () => {
    if (!publicKey) {
      alert("Please connect your wallet to cashout.");
      return;
    }

    if (!purchaseId) {
      alert("Please select a specific purchase to cashout. Go back and select a crate from your portfolio.");
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      const result = await apiService.cashout(publicKey.toString(), purchaseId);
      if (result.success) {
        // Use initialInvestment from wallets.json (includes 0.02 SOL fee + reroll fees)
        const initialInvestmentValue = initialInvestment || totalSol || 0;
        
        // Calculate values based on user's requirements:
        // - Final Value = totalSolReceived (total value before exit fee)
        // - Exit Fee = Final Value * 1%
        // - Final Payout = Final Value * 99% (amount received by user)
        const finalValue = result.totalSolReceived || 0;
        const exitFeeValue = finalValue * 0.01; // 1% of final value
        const finalPayoutValue = finalValue * 0.99; // 99% of final value
        
        // Calculate total return based on finalPayout (what user actually receives)
        const totalReturnValue = finalPayoutValue - initialInvestmentValue;
        const totalReturnPercentValue = initialInvestmentValue > 0 
          ? (totalReturnValue / initialInvestmentValue * 100) 
          : 0;

        // Store success data and show modal
        setSuccessData({
          initialInvestment: initialInvestmentValue.toFixed(4) + " SOL",
          finalValue: finalValue.toFixed(4) + " SOL",
          totalReturn: `${totalReturnValue >= 0 ? '+' : ''}${totalReturnValue.toFixed(4)} SOL`,
          totalReturnPercent: `${totalReturnPercentValue >= 0 ? '+' : ''}${totalReturnPercentValue.toFixed(2)}%`,
          exitFee: `-${exitFeeValue.toFixed(5)} SOL`,
          finalPayout: finalPayoutValue.toFixed(5) + " SOL",
          transactionSignature: result.signature || transactionSignature,
          category: purchaseCategory,
        });
        setShowSuccessModal(true);
      } else {
        setError("Cashout failed. Please try again.");
        alert("Cashout failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Cash out failed:", err);
      const errorMessage = err?.message || "Cashout failed. Please try again.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

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

      <main className="flex-1 flex flex-col px-4 sm:px-6 pb-6">
        <div className="flex-1 flex flex-col gap-6 sm:gap-8 max-w-[900px] w-full mx-auto bg-[#0D0D0D] rounded-3xl border-t border-t-[#C4C4C4] border-b border-b-[#5E5E5E] relative overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[1px] before:bg-gradient-to-b before:from-[#C4C4C4] before:to-[#5E5E5E] before:rounded-tl-3xl before:rounded-bl-3xl after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[1px] after:bg-gradient-to-b after:from-[#C4C4C4] after:to-[#5E5E5E] after:rounded-tr-3xl after:rounded-br-3xl">
          {/* Top Section with Image and Profit */}
            <img 
              src="/Vector.svg" 
              alt="Vector" 
              className="absolute top-[25px] left-[15px] w-4 h-4 cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => navigate("/your-crates")}
            />
           <div className="p-6 mx-6 mt-20 sm:p-8 rounded-lg border-t border-t-[#BBFE03] border-b border-b-[#191919] relative overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[1px] before:bg-gradient-to-b before:from-[#BBFE03] before:to-[#191919] before:rounded-tl-lg before:rounded-bl-lg after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[1px] after:bg-gradient-to-b after:from-[#BBFE03] after:to-[#191919] after:rounded-tr-lg after:rounded-br-lg">

            {/* Category Image with Label */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <span className="[font-family:'Inter',Helvetica] font-normal text-[#BBFE03] text-xs tracking-[0] leading-[normal] uppercase border border-solid border-[#BBFE03] px-2 py-1 rounded-3xl">
                {purchaseCategory ? purchaseCategory.toUpperCase() : 'CRATE'}
              </span>
              <div className="w-full max-w-[200px] aspect-square flex items-center justify-center rounded-lg overflow-hidden">
                {purchaseCategory && getCategoryImage(purchaseCategory) ? (
                  <img 
                    src={getCategoryImage(purchaseCategory)} 
                    alt={purchaseCategory || 'Category'} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <svg width="100" height="100" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                )}
              </div>
            </div>

            {/* Profit Since Crafting */}
            <div className="flex flex-col items-center gap-2">
              <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                Profit Since Crafting
              </span>
              {(() => {
                // Use pre-calculated P&L values from backend if available (for consistency with YourCrates)
                // Otherwise, fall back to calculating from individual tokens
                let totalPnlPercent: string;
                let totalPnlValue: string;
                let isPositive: boolean;

                if (preCalculatedPnl?.totalPnlPercent !== undefined && preCalculatedPnl?.totalPnlValue !== undefined) {
                  // Use pre-calculated values from backend
                  totalPnlPercent = preCalculatedPnl.totalPnlPercent;
                  totalPnlValue = preCalculatedPnl.totalPnlValue;
                  isPositive = preCalculatedPnl.isPositive !== undefined 
                    ? preCalculatedPnl.isPositive 
                    : (parseFloat(totalPnlValue) >= 0);
                } else {
                  // Fallback: Calculate from individual tokens
                  const totalInvested = tokens.reduce((sum, token) => sum + parseFloat(token.invested || '0'), 0);
                  const totalCurrentValue = tokens.reduce((sum, token) => sum + parseFloat(token.currentValue || '0'), 0);
                  const calculatedPnlValue = totalCurrentValue - totalInvested;
                  const calculatedPnlPercent = totalInvested > 0 ? ((calculatedPnlValue / totalInvested) * 100) : 0;
                  isPositive = calculatedPnlValue >= 0;
                  totalPnlPercent = calculatedPnlPercent.toFixed(2);
                  totalPnlValue = calculatedPnlValue.toFixed(4);
                }

                const pnlPercentFormatted = `${isPositive ? '+' : ''}${totalPnlPercent}%`;
                const pnlValueFormatted = `${isPositive ? '+' : ''}${parseFloat(totalPnlValue).toFixed(4)} SOL`;

                return (
                  <div className="flex items-center gap-2">
                    <img src={isPositive ? "/top.svg" : "/down.svg"} alt={isPositive ? "Profit" : "Loss"} className="w-4 h-4" />
                    <span className={`[font-family:'Inter',Helvetica] font-semibold text-base sm:text-lg tracking-[0] leading-[normal] ${
                      isPositive ? 'text-[#BBFE03]' : 'text-[#FE4A03]'
                    }`}>
                      {pnlPercentFormatted}
                    </span>
                    <span className={`[font-family:'Inter',Helvetica] font-semibold text-base sm:text-lg tracking-[0] leading-[normal] ${
                      isPositive ? 'text-[#BBFE03]' : 'text-[#FE4A03]'
                    }`}>
                      {pnlValueFormatted}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Token Table */}
          <div className="w-full p-4 sm:p-6 rounded-lg">
            {tokensLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loading size="lg" message="Loading token data..." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#5b5b5b]">
                      <th className="text-left py-3 px-2 [font-family:'Inter',Helvetica] font-normal text-[#bbbbbb] text-xs sm:text-sm tracking-[0] leading-[normal]">
                        TOKEN
                      </th>
                      <th className="text-left py-3 px-2 [font-family:'Inter',Helvetica] font-normal text-[#bbbbbb] text-xs sm:text-sm tracking-[0] leading-[normal]">
                        INVESTED
                      </th>
                      <th className="text-left py-3 px-2 [font-family:'Inter',Helvetica] font-normal text-[#bbbbbb] text-xs sm:text-sm tracking-[0] leading-[normal]">
                        CURRENT VALUE
                      </th>
                      <th className="text-left py-3 px-2 [font-family:'Inter',Helvetica] font-normal text-[#bbbbbb] text-xs sm:text-sm tracking-[0] leading-[normal]">
                        P&L
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token, index) => (
                    <tr key={index} className="border-b border-[#5b5b5b] last:border-0">
                      <td className="py-3 px-2">
                        <span className="[font-family:'Inter',Helvetica] font-medium text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                          {token.name}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <img src="/solana.svg" alt="Solana" className="w-3 h-3" />
                          <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                            {token.invested}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <img src="/solana.svg" alt="Solana" className="w-3 h-3" />
                          <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                            {token.currentValue}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`[font-family:'Inter',Helvetica] font-semibold text-sm sm:text-base tracking-[0] leading-[normal] ${
                          token.isPositive ? "text-[#BBFE03]" : "text-[#FE4A03]"
                        }`}>
                          {token.pnl}
                        </span>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cashout Button */}
          <Button
            onClick={handleConfirmCashOut}
            disabled={isProcessing || !purchaseId || !publicKey}
            className="w-[90%] mx-auto py-6 mb-10 bg-[#BBFE03] hover:bg-[#BBFE03]/90  [font-family:'Inter',Helvetica] font-normal text-black text-base sm:text-lg tracking-[0] leading-[normal]"
          >
            {isProcessing ? "Processing Transaction..." : "Confirm Cashout"}
          </Button>
          {error && (
            <div className="text-red-500 text-sm text-center mb-4">{error}</div>
          )}
        </div>
      </main>

      {/* Success Redeem Modal */}
      {showSuccessModal && successData && (
        <SuccessRedeem
          initialInvestment={successData.initialInvestment}
          finalValue={successData.finalValue}
          totalReturn={successData.totalReturn}
          totalReturnPercent={successData.totalReturnPercent}
          exitFee={successData.exitFee}
          finalPayout={successData.finalPayout}
          categoryName={successData.category ? successData.category.toUpperCase() : 'CRATE'}
          categoryImage={getCategoryImage(successData.category || undefined) || '/frame-3.png'}
          onBackToHome={() => {
            setShowSuccessModal(false);
            navigate("/your-crates");
          }}
          onViewTransaction={() => {
            const sig = successData.transactionSignature;
            if (sig) {
              window.open(`https://solscan.io/tx/${sig}`, "_blank");
            } else {
              window.open("https://solscan.io", "_blank");
            }
          }}
        />
      )}
    </div>
  );
};
