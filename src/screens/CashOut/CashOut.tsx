import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

  // Get purchase data from location state and fetch P&L from backend
  useEffect(() => {
    // Get purchaseId from location state (from YourCrates navigation)
    if (location.state?.purchaseId) {
      setPurchaseId(location.state.purchaseId);
    }
    // Get category and tokens from location state (from YourCrates navigation)
    if (location.state?.category) {
      setPurchaseCategory(location.state.category);
    }
    // Get totalSol from location state
    if (location.state?.totalSol) {
      setTotalSol(location.state.totalSol);
    }
  }, [location]);

  // Fetch tokens P&L and initialInvestment from backend when purchaseId is available
  useEffect(() => {
    const fetchTokensPnl = async () => {
      if (!purchaseId) {
        // If no purchaseId, try to use tokens from location state as fallback
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
        return;
      }

      try {
        setTokensLoading(true);
        // Fetch P&L data from backend
        const result = await apiService.getTokensPnl(purchaseId);
        
        if (result.success && result.tokens) {
          // Transform backend response to display format
          const displayTokens: TokenDisplay[] = result.tokens.map((token) => ({
            name: token.tokenName,
            invested: token.invested,
            currentValue: token.currentValue,
            pnl: token.pnl,
            isPositive: token.isPositive
          }));
          setTokens(displayTokens);
        } else {
          console.error('Failed to fetch tokens P&L:', result);
          setTokens([]);
        }
      } catch (error: any) {
        console.error('Error fetching tokens P&L:', error);
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
      } finally {
        setTokensLoading(false);
      }
    };

    const fetchInitialInvestment = async () => {
      if (!purchaseId || !publicKey) return;

      try {
        // Fetch wallet data to get initialInvestment for this purchaseId
        const walletResult = await apiService.getUserWallet(publicKey.toString());
        if (walletResult.success && walletResult.wallet?.tokenPurchases) {
          // Find the purchase group with matching purchaseId
          const purchaseGroup = walletResult.wallet.tokenPurchases.find(
            (purchase: any) => purchase.purchaseId === purchaseId
          );
          if (purchaseGroup?.initialInvestment !== undefined) {
            setInitialInvestment(parseFloat(purchaseGroup.initialInvestment) || 0);
            console.log(`✅ Loaded initialInvestment from wallets.json: ${purchaseGroup.initialInvestment} SOL`);
          } else {
            // Fallback: calculate from totalSol if initialInvestment not found
            console.warn(`⚠️ initialInvestment not found for purchaseId ${purchaseId}, using totalSol as fallback`);
            setInitialInvestment(totalSol || 0);
          }
        }
      } catch (error: any) {
        console.error('Error fetching initialInvestment:', error);
        // Fallback: use totalSol if fetch fails
        setInitialInvestment(totalSol || 0);
      }
    };

    fetchTokensPnl();
    fetchInitialInvestment();
  }, [purchaseId, location.state, publicKey, totalSol]);

  const handleConfirmCashOut = async () => {
    if (!purchaseId || !publicKey) {
      alert("Missing purchase information or wallet connection. Please go back and select a crate to cashout.");
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      const result = await apiService.cashout(publicKey.toString(), purchaseId);
      if (result.success) {
        // Use initialInvestment from wallets.json (includes 0.02 SOL fee + reroll fees)
        const initialInvestmentValue = initialInvestment || totalSol || 0;
        const finalPayoutValue = result.userAmount || 0;
        const totalReturnValue = finalPayoutValue - initialInvestmentValue;
        const totalReturnPercentValue = initialInvestmentValue > 0 
          ? (totalReturnValue / initialInvestmentValue * 100) 
          : 0;

        // Store success data and show modal
        setSuccessData({
          initialInvestment: initialInvestmentValue.toFixed(4) + " SOL",
          finalValue: (result.totalSolReceived || 0).toFixed(4) + " SOL",
          totalReturn: `${totalReturnValue >= 0 ? '+' : ''}${totalReturnValue.toFixed(4)} SOL`,
          totalReturnPercent: `${totalReturnPercentValue >= 0 ? '+' : ''}${totalReturnPercentValue.toFixed(2)}%`,
          exitFee: `-${(result.feeAmount || 0).toFixed(5)} SOL`,
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
                // Calculate total P&L from tokens
                const totalInvested = tokens.reduce((sum, token) => sum + parseFloat(token.invested || '0'), 0);
                const totalCurrentValue = tokens.reduce((sum, token) => sum + parseFloat(token.currentValue || '0'), 0);
                const totalPnlValue = totalCurrentValue - totalInvested;
                const totalPnlPercent = totalInvested > 0 ? ((totalPnlValue / totalInvested) * 100) : 0;
                const isPositive = totalPnlValue >= 0;
                const pnlPercentFormatted = `${isPositive ? '+' : ''}${totalPnlPercent.toFixed(2)}%`;
                const pnlValueFormatted = `${isPositive ? '+' : ''}${totalPnlValue.toFixed(4)} SOL`;

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
