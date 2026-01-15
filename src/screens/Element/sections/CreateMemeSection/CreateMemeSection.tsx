import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useGameFlow, GameFlowStep } from "../../../../context/GameFlowContext";
import { useSelectedCategory } from "../../../../context/SelectedCategoryContext";
import { apiService } from "../../../../services/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../../../../components/ui/toggle-group";
import { RollingAnimation } from "../../../../components/RollingAnimation";
import { WalletErrorModal } from "../../../../components/WalletErrorModal";
import { WalletErrorContext } from "../../../../context/WalletContext";
import { SelectToken } from "../../../selectToken";

const coinNumbers = [
  { value: "2", label: "2" },
  { value: "4", label: "4" },
  { value: "6", label: "6" },
  { value: "8", label: "8" },
];

export const CreateMemeSection = (): JSX.Element => {
  const navigate = useNavigate();
  const {
    currentStep,
    investmentAmount,
    setInvestmentAmount,
    selectedTheme,
    setSelectedTheme,
    selectedContractTheme,
    setSelectedContractTheme,
    numCoins,
    setNumCoins,
    allocationType,
    setAllocationType,
    coinPercentages,
    setCoinPercentages,
    currentCrate,
    isProcessing,
    error,
    displayedTokens,
    setDisplayedTokens,
    rerollCount,
    setRerollCount,
    createCrate,
    confirmCrate,
    rerollCoins,
    resetFlow,
    setIsRolling,
    clearError,
  } = useGameFlow();
  const { selectedCategory, lastSelectedAt } = useSelectedCategory();
  const { publicKey } = useWallet();
  const { showWalletError } = useContext(WalletErrorContext);
  const [isAnimating, setIsAnimating] = useState(false);
  const [usdAmount, setUsdAmount] = useState<number | null>(null);
  const [solanaPrice, setSolanaPrice] = useState<number | null>(null);
  const [showSelectToken, setShowSelectToken] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [selectedRerollSlots, setSelectedRerollSlots] = useState<number[]>([]);
  const [categoryPreviewImages, setCategoryPreviewImages] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [showWalletErrorModal, setShowWalletErrorModal] = useState(false);
  const [amountInputValue, setAmountInputValue] = useState<string>(() => 
    investmentAmount > 0 ? investmentAmount.toString() : ''
  );
  const [isRerolling, setIsRerolling] = useState(false); // Track reroll in progress
  const [isCrafting, setIsCrafting] = useState(false); // Track if fetching tokens

  // Fetch Solana price
  useEffect(() => {
    const fetchSolanaPrice = async () => {
      try {
        const response = await apiService.getSolPrice();
        if (response.success) {
          setSolanaPrice(response.price);
        }
      } catch (err) {
        console.error('Error fetching Solana price:', err);
        setSolanaPrice(150); // Fallback price
      }
    };

    fetchSolanaPrice();
    const interval = setInterval(fetchSolanaPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Cache random tokens when wallet is connected, or when numCoins/theme changes
  useEffect(() => {
    if (!publicKey) {
      return; // Don't cache if wallet is not connected
    }

    // Use selected values if available, otherwise use defaults
    const coinsToUse = numCoins || 4;
    const theme = selectedContractTheme || selectedTheme || 'celebrities';

    // Cache tokens in the background
    const cacheTokensAsync = async () => {
      try {
        await apiService.cacheTokens(publicKey.toString(), theme, coinsToUse);
        console.log(`✅ Cached ${coinsToUse} tokens for theme "${theme}"`);
      } catch (error) {
        console.error('Failed to cache tokens:', error);
        // Don't show error to user - this is a background operation
      }
    };

    cacheTokensAsync();
  }, [publicKey, numCoins, selectedTheme, selectedContractTheme]); // Cache when wallet connects or settings change

  // Convert SOL to USD when investment amount changes (with debounce)
  useEffect(() => {
    if (investmentAmount > 0) {
      // Debounce: wait 500ms after user stops typing before fetching
      const debounceTimer = setTimeout(async () => {
        try {
          setPriceLoading(true);
          const response = await apiService.convertSolToUsd(investmentAmount);
          if (response.success) {
            setUsdAmount(response.usdAmount);
          }
        } catch (err) {
          console.error('Error converting SOL to USD:', err);
          setUsdAmount(null);
        } finally {
          setPriceLoading(false);
        }
      }, 500);

      return () => clearTimeout(debounceTimer);
    } else {
      setUsdAmount(null);
    }
  }, [investmentAmount]);

  // Fetch categories for preview animation
  useEffect(() => {
    const fetchCategoriesForPreview = async () => {
      try {
        const response = await apiService.getCategories();
        if (response.success && response.categories) {
          const images = response.categories.map(cat => cat.image).filter(Boolean);
          setCategoryPreviewImages(images);
        }
      } catch (error) {
        console.error('Failed to fetch categories for preview:', error);
      }
    };
    
    // Only fetch if no category is selected
    if (!selectedCategory) {
      fetchCategoriesForPreview();
    }
  }, [selectedCategory]);

  // Animate category preview images when no category is selected (sliding from right to left)
  useEffect(() => {
    if (!selectedCategory && categoryPreviewImages.length > 0) {
      const interval = setInterval(() => {
        setCurrentPreviewIndex((prev: number) => (prev + 1) % categoryPreviewImages.length);
      }, 2000); // Change image every 2 seconds for smooth sliding effect
      
      return () => clearInterval(interval);
    }
  }, [selectedCategory, categoryPreviewImages]);

  // Generate random percentages that sum to 100% with high variance
  const generateRandomPercentages = (count: number): number[] => {
    if (count <= 0) return [];
    
    // Use a weighted random approach for more unpredictability
    // Generate random weights for each coin, then normalize to 100%
    const weights: number[] = [];
    
    // Generate random weights with high variance (using exponential distribution for more variation)
    for (let i = 0; i < count; i++) {
      // Use exponential random to create more variance (values can range from ~0.1 to ~10)
      // This creates a much wider distribution
      const randomWeight = Math.pow(Math.random(), 0.5); // Inverse square root for more high values
      weights.push(randomWeight);
    }
    
    // Calculate sum of weights
    const sum = weights.reduce((acc, val) => acc + val, 0);
    
    // Normalize to percentages that sum to 100%
    const percentages = weights.map(weight => {
      const percentage = (weight / sum) * 100;
      return Math.round(percentage * 10) / 10; // Round to 1 decimal
    });
    
    // Ensure minimum of 5% per coin and adjust if needed
    const minPercentage = 5;
    let adjustedPercentages = percentages.map(p => Math.max(p, minPercentage));
    const adjustedSum = adjustedPercentages.reduce((acc, val) => acc + val, 0);
    
    // If sum exceeds 100%, proportionally reduce
    if (adjustedSum > 100) {
      const scaleFactor = (100 - (minPercentage * count)) / (adjustedSum - (minPercentage * count));
      adjustedPercentages = adjustedPercentages.map(p => {
        const excess = p - minPercentage;
        return minPercentage + (excess * scaleFactor);
      });
    }
    
    // Normalize to exactly 100% (handle rounding errors)
    const finalSum = adjustedPercentages.reduce((acc, val) => acc + val, 0);
    const difference = 100 - finalSum;
    if (Math.abs(difference) > 0.01) {
      // Adjust the largest percentage to account for rounding
      const maxIndex = adjustedPercentages.indexOf(Math.max(...adjustedPercentages));
      adjustedPercentages[maxIndex] = Math.round((adjustedPercentages[maxIndex] + difference) * 10) / 10;
    }
    
    // Shuffle the percentages to make it even more unpredictable
    for (let i = adjustedPercentages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [adjustedPercentages[i], adjustedPercentages[j]] = [adjustedPercentages[j], adjustedPercentages[i]];
    }
    
    return adjustedPercentages.map(p => Math.round(p * 10) / 10);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setAmountInputValue(inputValue);
    
    // Allow empty string for deletion
    if (inputValue === '' || inputValue === '.') {
      setInvestmentAmount(0);
      return;
    }
    
    // Parse the value, but allow empty/partial input
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      setInvestmentAmount(numValue);
    }
  };

  // Show wallet error modal when error contains wallet-related messages
  useEffect(() => {
    if (error) {
      const errorLower = error.toLowerCase();
      // Check for wallet-related errors: wallet, connect, rejected, connection, etc.
      if (
        errorLower.includes('wallet') || 
        errorLower.includes('connect') || 
        errorLower.includes('rejected') ||
        errorLower.includes('connection') ||
        errorLower.includes('user rejected')
      ) {
        setShowWalletErrorModal(true);
      } else {
        setShowWalletErrorModal(false);
      }
    } else {
      setShowWalletErrorModal(false);
    }
  }, [error]);

  // Generate random percentages on mount if Random is already selected
  useEffect(() => {
    if (allocationType === "random" && numCoins > 0 && !coinPercentages) {
      const randomPercentages = generateRandomPercentages(numCoins);
      setCoinPercentages(randomPercentages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Sync selected category with game flow
  useEffect(() => {
    if (selectedCategory) {
      // Use displayName from category if available, otherwise use name
      setSelectedTheme(selectedCategory.name);
      // Store contract theme if available
      if (selectedCategory.contractTheme) {
        setSelectedContractTheme(selectedCategory.contractTheme);
      }
    }
  }, [selectedCategory, setSelectedTheme, setSelectedContractTheme]);

  useEffect(() => {
    if (lastSelectedAt) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastSelectedAt]);

  const handleAllocationTypeChange = (value: string | null) => {
    if (value) {
      const newType = value as "equal" | "random";
      setAllocationType(newType);
      
      // Generate random percentages if Random is selected
      if (newType === "random" && numCoins > 0) {
        const randomPercentages = generateRandomPercentages(numCoins);
        setCoinPercentages(randomPercentages);
      } else {
        // Clear percentages for equal allocation
        setCoinPercentages(null);
      }
    }
  };

  const handleCraftCrate = async () => {
    if (!investmentAmount || investmentAmount <= 0) {
      alert("Please enter a valid investment amount");
      return;
    }
    if (![2, 4, 6, 8].includes(numCoins)) {
      alert("Please select 2, 4, 6, or 8 coins");
      return;
    }
    if (!publicKey) {
      showWalletError("Please connect your wallet");
      return;
    }

    // Show SelectToken modal
    setShowSelectToken(true);
  };


  const handleRerollTokens = async () => {
    if (!publicKey || !selectedTheme || !numCoins) {
      return;
    }

    try {
      setIsRerolling(true);
      const theme = selectedContractTheme || selectedTheme || 'celebrities';
      
      // Generate new random tokens by calling cacheTokens again
      // This will generate different random numbers
      const response = await apiService.cacheTokens(
        publicKey.toString(),
        theme,
        numCoins
      );

      if (response.success && response.tokens) {
        // Fetch the newly cached tokens
        const cachedResponse = await apiService.getCachedTokens(
          publicKey.toString(),
          theme,
          numCoins
        );

        if (cachedResponse.success && cachedResponse.tokens) {
          // Update displayed tokens
          setDisplayedTokens(cachedResponse.tokens);
          setRerollCount(rerollCount + 1);
          console.log('✅ Rerolled tokens:', cachedResponse.tokens);
        }
      } else {
        throw new Error('Failed to reroll tokens');
      }
    } catch (error: any) {
      console.error('❌ Error rerolling tokens:', error);
      alert(error.message || 'Failed to reroll tokens. Please try again.');
    } finally {
      setIsRerolling(false);
    }
  };

  // Rolling animation is now handled in PortfolioSection

  const handleReroll = async () => {
    if (selectedRerollSlots.length === 0) {
      alert("Please select at least one coin slot to reroll");
      return;
    }
    await rerollCoins(selectedRerollSlots);
    setSelectedRerollSlots([]);
  }; 

  // Main create section
  return (
    <section className="flex justify-center">
      <div className="w-[70%]">
        <div className="flex flex-col lg:flex-row w-full items-start justify-between gap-4 lg:gap-6 px-4 sm:px-6 lg:px-[30px] py-4 sm:py-[15px] 
        bg-[#0D0D0D] rounded-3xl border-t border-t-[#C4C4C4] border-b border-b-[#5E5E5E] relative overflow-hidden before:content-[''] before:absolute 
        before:left-0 before:top-0 before:bottom-0 before:w-[1px] before:bg-gradient-to-b before:from-[#C4C4C4] before:to-[#5E5E5E] before:rounded-tl-3xl 
        before:rounded-bl-3xl after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[1px] after:bg-gradient-to-b after:from-[#C4C4C4] 
        after:to-[#5E5E5E] after:rounded-tr-3xl after:rounded-br-3xl">
          <div className="flex flex-col items-start gap-4 sm:gap-[30px] flex-shrink-0 w-full lg:w-auto">
            <div className="flex flex-col gap-0">
              <h2 className="[font-family:'Inter',Helvetica] font-medium text-[#BBFE03] tracking-[0] leading-7">
                Create
                <br />
                Your Memecrate
              </h2>
              <p className="[font-family:'Inter',Helvetica] font-normal text-[#bbbbbb] text-xs tracking-[0] leading-[normal]">
                Follow the steps
              </p>
            </div>
          </div>

          {/* <div className="flex flex-col items-start gap-2.5 flex-shrink-0 w-full lg:w-auto">
            <Label className="[font-family:'Inter',Helvetica] font-normal text-[#f9f9f9] tracking-[0] leading-[normal]">
              Pick a category:
            </Label>
            <Card
              onClick={() => navigate("/pick-category")}
              className={`w-full sm:w-[258px] h-[230px] border-2 border-solid rounded-none cursor-pointer transition-all duration-500 overflow-hidden relative ${
                isAnimating
                  ? "border-white animate-card-select"
                  : "border-[#b6b6b6] hover:border-white"
              }`}
            >
              {selectedCategory ? (
                // Show selected category image
                <div
                  className="absolute inset-0 bg-cover bg-[50%_50%]"
                  style={{
                    backgroundImage: `url(${selectedCategory.image})`,
                  }}
                />
              ) : categoryPreviewImages.length > 0 ? (
                // Show sliding animation
                <div className="absolute inset-0 overflow-hidden">
                  <div
                    className="flex h-full transition-transform duration-1000 ease-linear"
                    style={{
                      width: `${categoryPreviewImages.length * 100}%`,
                      transform: `translateX(-${(currentPreviewIndex / categoryPreviewImages.length) * 100}%)`,
                    }}
                  >
                    {categoryPreviewImages.map((image, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 w-full h-full bg-cover bg-[50%_50%]"
                        style={{
                          width: `${100 / categoryPreviewImages.length}%`,
                          backgroundImage: `url(${image})`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                // Fallback image
                <div
                  className="absolute inset-0 bg-cover bg-[50%_50%]"
                  style={{
                    backgroundImage: `url("/frame-3.png")`,
                  }}
                />
              )}
              <CardContent className="relative z-10 p-[15px]">
                <span
                  className={`[font-family:'Kanit',Helvetica] font-medium text-sm sm:text-base tracking-[0] leading-[normal] transition-colors duration-500 ${
                    isAnimating ? "text-white" : "text-[#a9a9a9]"
                  }`}
                >
                  {selectedCategory?.name || "Select Category"}
                </span>
              </CardContent>
            </Card>
          </div> */}

          <div className="flex flex-col items-start justify-center gap-2.5 flex-shrink-0 w-full lg:w-auto">
            <div className="flex flex-col w-full items-start gap-1.5">
              <Label className="[font-family:'Inter',Helvetica] font-normal text-[#f9f9f9] text-sm sm:text-base tracking-[0] leading-[normal]">
                Amount (SOL)
              </Label>
              <div className="relative w-full sm:w-[231px] rounded-md">
                <Input
                  type="number"
                  step="0.01"                  
                  placeholder="0.1"
                  value={amountInputValue}
                  onChange={handleAmountChange}
                  className="w-full bg-[#4e4e4e] border-0 text-white [font-family:'Inter',Helvetica] font-normal text-sm sm:text-base tracking-[0] leading-[normal] px-2.5 py-2 sm:py-[13px] h-auto rounded-md placeholder:text-[#9a9a9a] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
                {investmentAmount > 0 && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#bbbbbb] text-sm pointer-events-none">
                    {priceLoading ? (
                      '(Loading...)'
                    ) : usdAmount !== null ? (
                      `($${usdAmount.toFixed(2)})`
                    ) : null}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col w-full lg:w-[332px] items-start gap-1.5">
              <Label className="[font-family:'Inter',Helvetica] font-normal text-[#f9f9f9] text-sm sm:text-base tracking-[0] leading-[normal]">
                Allocation Type
              </Label>
              <ToggleGroup
                type="single"
                value={allocationType}
                onValueChange={handleAllocationTypeChange}
                className="h-[45px] sm:h-[50px] justify-start pl-1 pr-2 py-[5px] bg-[#343434] gap-2 sm:gap-2.5 rounded-md w-full sm:w-auto"
              >
                <ToggleGroupItem
                  value="equal"
                  className="flex-1 sm:flex-none sm:w-[60px] px-2 sm:px-2.5 py-2 bg-[#c0c0c0] data-[state=on]:bg-[#c0c0c0] data-[state=off]:bg-transparent hover:bg-[#c0c0c0] [font-family:'Inter',Helvetica] font-medium text-[#2c2c2c] data-[state=on]:text-[#2c2c2c] data-[state=off]:text-white text-sm sm:text-base tracking-[0] leading-[normal] rounded-md"
                >
                  Equal
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="random"
                  className="flex-1 sm:flex-none px-2 sm:px-2.5 py-2 bg-transparent data-[state=on]:bg-[#c0c0c0] data-[state=off]:bg-transparent hover:bg-[#c0c0c0] [font-family:'Inter',Helvetica] font-medium text-white data-[state=on]:text-[#2c2c2c] data-[state=off]:text-white text-sm sm:text-base tracking-[0] leading-[normal] rounded-md"
                >
                  Random
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex flex-col w-full lg:w-[332px] items-start gap-1.5">
              <Label className="[font-family:'Inter',Helvetica] font-normal text-[#f9f9f9] text-sm sm:text-base tracking-[0] leading-[normal]">
                Numbers of Coins
              </Label>
              <ToggleGroup
                type="single"
                value={numCoins.toString()}
                onValueChange={async (value) => {
                  if (value) {
                    const newNumCoins = parseInt(value);
                    setNumCoins(newNumCoins);
                    
                    // Regenerate random percentages if Random allocation is selected
                    if (allocationType === "random" && newNumCoins > 0) {
                      const randomPercentages = generateRandomPercentages(newNumCoins);
                      setCoinPercentages(randomPercentages);
                    } else {
                      setCoinPercentages(null);
                    }

                    // Fetch first N tokens for preview and cache random tokens
                    if (publicKey && (selectedContractTheme || selectedTheme)) {
                      const theme = selectedContractTheme || selectedTheme || 'celebrities';
                      try {
                        // Fetch first N tokens (for preview - this will be used by PortfolioSection)
                        await apiService.getFirstTokens(newNumCoins, theme);
                        
                        // Cache random tokens in backend
                        await apiService.cacheTokens(publicKey.toString(), theme, newNumCoins);
                        console.log(`✅ Cached ${newNumCoins} random tokens for ${theme}`);
                      } catch (error) {
                        console.error('Failed to fetch first tokens or cache tokens:', error);
                      }
                    }
                  }
                }}
                className="h-[45px] sm:h-[50px] px-1 py-[5px] bg-[#343434] gap-1.5 sm:gap-2.5 rounded-sm w-full sm:w-auto"
              >
                {coinNumbers.map((coin) => (
                  <ToggleGroupItem
                    key={coin.value}
                    value={coin.value}
                    className="flex-1 sm:flex-none sm:w-10 px-2 sm:px-2.5 py-2 bg-[#3c3c3c] data-[state=on]:bg-[#3c3c3c] data-[state=on]:border data-[state=on]:border-solid data-[state=on]:border-[#c0c0c0] data-[state=off]:bg-[#3c3c3c] data-[state=off]:border-0 hover:bg-[#3c3c3c] [font-family:'Inter',Helvetica] font-medium text-white text-sm sm:text-base tracking-[0] leading-[normal] rounded-sm"
                  >
                    {coin.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>

          <Button
            onClick={handleCraftCrate}
            disabled={(isProcessing || isCrafting) || !investmentAmount}
            className="h-auto w-full sm:w-auto px-4 sm:px-2.5 py-2.5 bg-[#BBFE03] hover:bg-[#BBFE03]/90 disabled:bg-[#BBFE03]/50 disabled:cursor-not-allowed [font-family:'Inter',Helvetica] font-normal text-black tracking-[0] leading-[normal] rounded-md"
          >
            {isCrafting ? "Loading..." : isProcessing ? "Processing..." : "Craft Crate"}
          </Button>
        </div>


        {/* Wallet error modal - only show for wallet-related errors */}
        {showWalletErrorModal && error && (
          <WalletErrorModal
            error={error}
            onClose={() => {
              setShowWalletErrorModal(false);
              clearError(); // Clear the error when modal is closed
            }}
          />
        )}
        
        {/* Show other errors inline (not wallet-related) - only if not a wallet error */}
        {error && !showWalletErrorModal && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500 text-red-500 rounded">
            {error}
          </div>
        )}
      </div>

      {/* SelectToken Modal */}
      {showSelectToken && (
        <SelectToken
          onBack={() => setShowSelectToken(false)}
          numCoins={numCoins}
          selectedTheme={selectedTheme || ''}
          selectedContractTheme={selectedContractTheme || undefined}
          investmentAmount={investmentAmount || 0}
          solanaPrice={solanaPrice}
          allocationType={allocationType}
          coinPercentages={coinPercentages || []}
          onConfirm={(tokens) => {
            setDisplayedTokens(tokens);
            setRerollCount(0);
            console.log('✅ Tokens selected and saved:', tokens);
          }}
          onCreateCrate={async () => {
            if (!publicKey) {
              showWalletError("Please connect your wallet");
              return;
            }
            // Start transaction flow
            setIsRolling(true);
            // Delay before sending POST request
            await new Promise(resolve => setTimeout(resolve, 5000));
            // Create the crate (this will trigger wallet sign modal)
            await createCrate();
          }}
        />
      )}
    </section>
  );
};
