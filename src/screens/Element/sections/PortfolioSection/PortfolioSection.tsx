import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import { useSelectedCoins } from "../../../../context/SelectedCoinsContext";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useGameFlow, GameFlowStep } from "../../../../context/GameFlowContext";
import { apiService, Token } from "../../../../services/api";
import { SystemProgram, Transaction, LAMPORTS_PER_SOL, PublicKey, Connection } from "@solana/web3.js";

export const PortfolioSection = (): JSX.Element => {
  const navigate = useNavigate();
  const { selectedCoins } = useSelectedCoins();
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { confirmCrate, currentCrate, currentStep, setCurrentStep, numCoins, selectedTheme, selectedContractTheme, isRolling, setIsRolling, investmentAmount, allocationType, coinPercentages, displayedTokens, setDisplayedTokens, rerollCount, setRerollCount } = useGameFlow();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [defaultTokens, setDefaultTokens] = useState<Token[]>([]); // Default tokens before crafting
  const [tokensLoading, setTokensLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTokens, setAnimationTokens] = useState<Token[]>([]);
  const [allTokenImages, setAllTokenImages] = useState<string[]>([]);
  const [solanaPrice, setSolanaPrice] = useState<number | null>(null);
  const [showTokensAnimation, setShowTokensAnimation] = useState(false);
  const [isFlowAnimating, setIsFlowAnimating] = useState(true); // Flow animation state
  const [flowTokenArrays, setFlowTokenArrays] = useState<Token[][]>([]); // Token arrays for flow animation
  const [flowScrollPositions, setFlowScrollPositions] = useState<number[]>([]); // Scroll positions for flow
  const [isFlowLoading, setIsFlowLoading] = useState(false); // Loading state when numCoins changes
  const flowAnimationFrameRef = useRef<number | null>(null);
  const flowStartTimeRef = useRef<number>(0);
  
  // Fetch Solana price from backend
  useEffect(() => {
    const fetchSolanaPrice = async () => {
      try {
        const response = await apiService.getSolPrice();
        if (response.success) {
          setSolanaPrice(response.price);
        }
      } catch (err) {
        console.error('Error fetching Solana price:', err);
        // Set a fallback price if API fails
        setSolanaPrice(150);
      }
    };

    fetchSolanaPrice();
    
    // Refresh price every 5 minutes (backend updates every 30 minutes)
    const interval = setInterval(fetchSolanaPrice, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch portfolio when wallet is connected
  useEffect(() => {
    if (publicKey && currentStep === "PORTFOLIO") {
      fetchPortfolio();
    }
  }, [publicKey, currentStep]);

  const fetchPortfolio = async () => {
    if (!publicKey) return;
    try {
      setLoading(true);
      const response = await apiService.getPortfolio(publicKey.toString());
      setPortfolio(response);
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultTokens = useCallback(async () => {
    if (!numCoins || ![2, 4, 6, 8].includes(numCoins)) {
      setDefaultTokens([]);
      return;
    }
    
    const theme = selectedContractTheme || selectedTheme;
    if (!theme) {
      setDefaultTokens([]);
      return;
    }
    
    try {
      setTokensLoading(true);
      // Fetch first N tokens for preview (not random)
      const response = await apiService.getFirstTokens(numCoins, theme);
      if (response.success && response.tokens) {
        // Only update if we're still not rolling
        if (!isRolling) {
          setDefaultTokens(response.tokens);
        }
      }
    } catch (error) {
      console.error("Failed to fetch default tokens:", error);
      setDefaultTokens([]);
    } finally {
      setTokensLoading(false);
    }
  }, [numCoins, selectedContractTheme, selectedTheme, isRolling]);

  // Fetch default tokens when numCoins and category are selected (before crafting)
  useEffect(() => {
    // Don't fetch if rolling is in progress
    if (isRolling) return;
    
    // Clear old tokens immediately when numCoins or theme changes
    if (numCoins && [2, 4, 6, 8].includes(numCoins)) {
      // Use selectedContractTheme if available, otherwise fallback to selectedTheme
      const theme = selectedContractTheme || selectedTheme;
      if (theme) {
        // Clear existing tokens first to show loading state and allow defaultTokens to display
        setDefaultTokens([]);
        setTokens([]); // Clear rolled tokens so defaultTokens can be shown
        setShowTokensAnimation(false);
        // Fetch new tokens with the updated count
        fetchDefaultTokens();
      } else {
        // If no theme selected, clear tokens
        setDefaultTokens([]);
        setTokens([]);
        setShowTokensAnimation(false);
      }
    } else {
      // If invalid numCoins, clear tokens
      setDefaultTokens([]);
      setTokens([]);
      setShowTokensAnimation(false);
    }
  }, [numCoins, selectedContractTheme, selectedTheme, isRolling, fetchDefaultTokens]);

  // Trigger animation when defaultTokens are loaded
  useEffect(() => {
    if (defaultTokens.length > 0 && !isRolling && !isAnimating) {
      setShowTokensAnimation(true);
    }
  }, [defaultTokens.length, isRolling, isAnimating]);

  // Start continuous flow animation when numCoins is set (runs until Confirm Craft)
  // Uses default numCoins=4 and default theme='celebrities' if not selected
  useEffect(() => {
    // Use default numCoins=4 if not set or invalid
    const coinsToUse = (numCoins && [2, 4, 6, 8].includes(numCoins)) ? numCoins : 4;
    
    // Use selected theme or default to 'celebrities'
    const theme = selectedContractTheme || selectedTheme || 'celebrities';

    // Don't start flow if displayedTokens are already set (user already confirmed)
    if (displayedTokens.length > 0) {
      setIsFlowAnimating(false);
      setIsFlowLoading(false);
      return;
    }

    // Show loading when numCoins changes
    setIsFlowLoading(true);
    setIsFlowAnimating(false);
    
    // Clear existing flow arrays
    setFlowTokenArrays([]);
    setFlowScrollPositions([]);
    
    // Stop any existing animation
    if (flowAnimationFrameRef.current !== null) {
      cancelAnimationFrame(flowAnimationFrameRef.current);
      flowAnimationFrameRef.current = null;
    }

    // Start flow animation with default values if needed
    startFlowAnimation(theme, coinsToUse).then(() => {
      setIsFlowLoading(false);
      setIsFlowAnimating(true);
    });

    return () => {
      // Cleanup on unmount or when dependencies change
      if (flowAnimationFrameRef.current !== null) {
        cancelAnimationFrame(flowAnimationFrameRef.current);
        flowAnimationFrameRef.current = null;
      }
    };
  }, [numCoins, selectedContractTheme, selectedTheme, displayedTokens.length]);

  // Stop flow animation when displayedTokens are set (after Confirm Craft)
  useEffect(() => {
    if (displayedTokens.length > 0 && isFlowAnimating) {
      // Finish flow animation and show selected tokens
      finishFlowAnimation();
    }
  }, [displayedTokens.length, isFlowAnimating]);

  // Start animation and fetch tokens when rolling starts
  useEffect(() => {
    if (isRolling && numCoins && selectedTheme) {
      // Clear default tokens when rolling starts
      setDefaultTokens([]);
      const cleanup = startRollingAnimation();
      return cleanup;
    }
  }, [isRolling, numCoins, selectedTheme, selectedContractTheme]);

  // Start continuous flow animation with random tokens at constant speed
  const startFlowAnimation = async (theme: string, coinsCount?: number): Promise<void> => {
    try {
      // Use provided coinsCount or fallback to numCoins or default 4
      const coinsToUse = coinsCount || numCoins || 4;
      
      // Fetch random tokens for flow animation
      const batchRequests = [
        apiService.getRandomTokens(8, theme),
        apiService.getRandomTokens(8, theme),
        apiService.getRandomTokens(8, theme),
        apiService.getRandomTokens(8, theme),
      ];
      
      const batchResponses = await Promise.all(batchRequests);
      const allRandomTokens: Token[] = [];
      
      batchResponses.forEach(response => {
        if (response.success && response.tokens) {
          allRandomTokens.push(...response.tokens);
        }
      });

      if (allRandomTokens.length === 0) {
        return;
      }

      // Create token arrays for each position (infinite loop style)
      const arrays: Token[][] = [];
      const initialScrollPositions: number[] = [];
      
      for (let i = 0; i < coinsToUse; i++) {
        // Create array with 30 random tokens (for seamless looping)
        const positionArray: Token[] = [];
        
        for (let j = 0; j < 30; j++) {
          const randomIndex = Math.floor(Math.random() * allRandomTokens.length);
          positionArray.push(allRandomTokens[randomIndex] || {
            category: '',
            name: `Token ${j}`,
            address: '',
            image: '/frame-3.png'
          });
        }
        
        arrays.push(positionArray);
        initialScrollPositions.push(0);
      }
      
      setFlowTokenArrays(arrays);
      setFlowScrollPositions(initialScrollPositions);
      flowStartTimeRef.current = performance.now();

      // Start continuous flow animation at constant speed
      const tokenHeight = 100;
      const constantSpeed = 0.15; // pixels per millisecond (constant speed)
      
      const animate = (currentTime: number) => {
        // Stop if displayedTokens are set (user confirmed)
        if (displayedTokens.length > 0) {
          setIsFlowAnimating(false);
          return;
        }

        const deltaTime = currentTime - flowStartTimeRef.current;
        flowStartTimeRef.current = currentTime;

        setFlowScrollPositions(prev => {
          return prev.map((pos, index) => {
            // Constant speed scrolling
            const newPos = pos + (constantSpeed * deltaTime);
            const arrayLength = arrays[index]?.length || 30;
            const maxScroll = (arrayLength - 1) * tokenHeight;
            
            // Loop back to start when reaching the end
            if (newPos >= maxScroll) {
              return 0;
            }
            
            return newPos;
          });
        });

        if (isFlowAnimating && displayedTokens.length === 0) {
          flowAnimationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      flowAnimationFrameRef.current = requestAnimationFrame(animate);
    } catch (error) {
      console.error("Failed to start flow animation:", error);
      setIsFlowAnimating(false);
    }
  };

  // Finish flow animation and show selected tokens
  const finishFlowAnimation = () => {
    setIsFlowAnimating(false);
    if (flowAnimationFrameRef.current !== null) {
      cancelAnimationFrame(flowAnimationFrameRef.current);
      flowAnimationFrameRef.current = null;
    }
    // Clear flow arrays
    setFlowTokenArrays([]);
    setFlowScrollPositions([]);
  };

  const startRollingAnimation = (): (() => void) => {
    if (!numCoins || !selectedTheme) {
      return () => {}; // Return empty cleanup
    }
    
    setIsAnimating(true);
    setTokensLoading(true);
    
    let animationFrame: ReturnType<typeof setTimeout> | null = null;
    
    const initAnimation = async () => {
      try {
        const contractTheme = selectedContractTheme || selectedTheme.toLowerCase();
        
        // Get tokens for animation - request multiple batches to get variety
        // Backend only allows 2, 4, 6, or 8 coins, so we'll request multiple times
        const allImages: string[] = [];
        
        // Request tokens in batches (8, 8, 4 = 20 tokens total for animation variety)
        const batchRequests = [
          apiService.getRandomTokens(8, contractTheme),
          apiService.getRandomTokens(8, contractTheme),
          apiService.getRandomTokens(4, contractTheme),
        ];
        
        const batchResponses = await Promise.all(batchRequests);
        
        // Collect all images from all batches
        batchResponses.forEach(response => {
          if (response.success && response.tokens) {
            const images = response.tokens.map(t => t.image);
            allImages.push(...images);
          }
        });
        
        // Remove duplicates and set
        const uniqueImages = [...new Set(allImages)];
        setAllTokenImages(uniqueImages);
      
      // Start animation
      const animationDuration = 3000; // 3 seconds
      const fastPhase = 2000; // Fast changes for first 2 seconds
      const slowPhase = 1000; // Slow down for last 1 second
      
        let startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          
          if (elapsed < animationDuration) {
            // Calculate interval - fast at start, slow at end
            let interval: number;
            if (elapsed < fastPhase) {
              // Fast phase: change every 50ms
              interval = 50;
            } else {
              // Slow phase: gradually increase interval from 50ms to 200ms
              const slowProgress = (elapsed - fastPhase) / slowPhase;
              interval = 50 + (slowProgress * 150);
            }
            
            // Update animation tokens with random images
            if (allTokenImages.length > 0) {
              const animatedTokens: Token[] = Array.from({ length: numCoins }, (_, i) => {
                const randomImageIndex = Math.floor(Math.random() * allTokenImages.length);
                return {
                  category: 'animation',
                  name: `Token ${i + 1}`,
                  address: '',
                  image: allTokenImages[randomImageIndex]
                };
              });
              setAnimationTokens(animatedTokens);
            }
            
            animationFrame = setTimeout(animate, interval) as any;
          } else {
            // Animation complete - fetch final tokens
            fetchFinalTokens(contractTheme);
          }
        };
        
        animate();
      } catch (error) {
        console.error("Failed to start animation:", error);
        setIsAnimating(false);
        setTokensLoading(false);
        setIsRolling(false);
      }
    };
    
    initAnimation();
    
    // Return cleanup function
    return () => {
      if (animationFrame) {
        clearTimeout(animationFrame);
      }
    };
  };

  const fetchFinalTokens = async (contractTheme: string) => {
    try {
      const response = await apiService.getRandomTokens(numCoins, contractTheme);
      if (response.success && response.tokens) {
        setTokens(response.tokens);
        setAnimationTokens([]);
        
        // Save crate data to backend after tokens are fetched
        if (currentCrate && publicKey && response.tokens.length > 0) {
          try {
            await apiService.saveCrateData({
              crateId: currentCrate.crateId,
              cratePDA: currentCrate.cratePDA,
              userPublicKey: publicKey.toString(),
              investmentAmount: investmentAmount,
              theme: selectedTheme || contractTheme,
              numCoins: numCoins,
              splitType: allocationType,
              coins: currentCrate.coins || [],
              tokens: response.tokens,
              transactionSignature: '',
            });
          } catch (saveErr) {
            console.error('Failed to save crate data:', saveErr);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch final tokens:", error);
    } finally {
      setIsAnimating(false);
      setTokensLoading(false);
      setIsRolling(false);
    }
  };

  const handleMoveToPortfolio = async () => {
    // Tokens are already purchased and saved when createCrate completes
    // No need to call confirmCrate() - it's disabled in the backend
    // Navigate to yourcrates page
    navigate('/your-crates');
  };

  // Reroll handler: Get new random token for specific index (no SOL transfer, fee added to main transaction)
  const handleReroll = useCallback(async (tokenIndex: number) => {
    if (!publicKey || !selectedContractTheme && !selectedTheme) {
      return;
    }

    try {
      const theme = selectedContractTheme || selectedTheme || 'celebrities';
      
      // Get current displayed tokens
      const currentTokens = displayedTokens.length > 0 ? displayedTokens : tokens;
      
      // Call backend to get new random token for this specific index
      const response = await apiService.rerollSingleToken(
        publicKey.toString(),
        theme,
        tokenIndex,
        currentTokens
      );

      if (response.success && response.token) {
        // Update displayedTokens if available, otherwise update tokens
        if (displayedTokens.length > 0) {
          const newDisplayedTokens = [...displayedTokens];
          newDisplayedTokens[tokenIndex] = response.token;
          setDisplayedTokens(newDisplayedTokens);
        } else {
          setTokens((prevTokens) => {
            const newTokens = [...prevTokens];
            newTokens[tokenIndex] = response.token;
            return newTokens;
          });
        }
        
        // Increment reroll count
        setRerollCount(rerollCount + 1);
        console.log('✅ Token rerolled at index', tokenIndex, 'New token:', response.token.name);
      }
    } catch (error: any) {
      console.error("Reroll failed:", error);
      alert(error.message || "Failed to reroll token. Please try again.");
    }
  }, [publicKey, selectedContractTheme, selectedTheme, displayedTokens, tokens, setDisplayedTokens, rerollCount, setRerollCount, setTokens]);

  // Use displayedTokens if available (after Confirm Craft), otherwise show flow animation
  const shouldShowDisplayedTokens = displayedTokens.length > 0 && !isFlowAnimating;
  const showFlowAnimation = isFlowAnimating && displayedTokens.length === 0 && flowTokenArrays.length > 0;
  
  const displayTokens = shouldShowDisplayedTokens
    ? displayedTokens.map((token: any) => ({
        category: token.category || '',
        name: token.name || '',
        address: token.address || '',
        image: token.image || '/frame-3.png'
      }))
    : (isAnimating 
      ? animationTokens 
      : (defaultTokens.length > 0 && !isRolling && !isFlowAnimating
        ? defaultTokens 
      : (tokens.length > 0 
        ? tokens 
          : defaultTokens)));
  
  // Calculate percentage per coin based on allocation type
  const getPercentageForCoin = (index: number): number => {
    if (allocationType === "random" && coinPercentages && coinPercentages.length > index) {
      return coinPercentages[index];
    }
    // Equal allocation (default)
    return displayTokens.length > 0 ? 100 / displayTokens.length : 0;
  };
  
  // Keep percentagePerCoin for backward compatibility (used for calculations)
  const percentagePerCoin = displayTokens.length > 0 ? 100 / displayTokens.length : 0;
  
  return (
    <>
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .loading-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    <section className="flex justify-center mt-12">
      <div className="flex justify-center min-h-[400px] w-[70%] bg-[#0D0D0D] rounded-3xl border-t border-t-[#C4C4C4] border-b border-b-[#5E5E5E] relative overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[1px] before:bg-gradient-to-b before:from-[#C4C4C4] before:to-[#5E5E5E] before:rounded-tl-3xl before:rounded-bl-3xl after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[1px] after:bg-gradient-to-b after:from-[#C4C4C4] after:to-[#5E5E5E] after:rounded-tr-3xl after:rounded-br-3xl py-12">
        <div className="flex flex-col w-full items-center justify-center gap-6 sm:gap-8 lg:gap-[39px] px-4 sm:px-8 lg:px-[186px] py-8 sm:py-12 lg:py-[138px] relative">
          <div className="w-full overflow-x-auto">
            <div className={`flex flex-col sm:flex-row sm:flex-nowrap items-start sm:items-center sm:min-w-max justify-center gap-4`}>
              {!isAnimating && !tokensLoading && displayTokens.length === 0 && !showFlowAnimation && !isFlowLoading ? (
                <div className="text-white text-center py-4 w-full sm:w-[100px] flex-shrink-0">
                  Select a category and number of coins to see tokens
                </div>
              ) : isFlowLoading ? Array.from({ length: numCoins || 4 }, (_, index) => {
                const coinPercentage = getPercentageForCoin(index);
                const percentageDecimal = coinPercentage / 100;
                const calculatedValue = investmentAmount && solanaPrice 
                  ? investmentAmount * solanaPrice * percentageDecimal 
                  : 0;
                const currentValue = `Current Value $${calculatedValue.toFixed(2)}`;

                return (
                  <div
                    key={index}
                    className="flex flex-col w-[100px] flex-shrink-0 items-center gap-[12px] relative"
                  >
                    <div className="flex items-center justify-center gap-2 px-2 py-[8px] relative self-stretch w-full flex-[0_0_auto] bg-[#212121] rounded-md">
                      <div className="relative w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-[#eaeaea] text-[10px] tracking-[0] leading-[normal]">
                        {currentValue}
                      </div>
                    </div>

                    {/* Loading container */}
                    <div className="relative w-[100px] h-[100px] overflow-hidden bg-[#1a1a1a] flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-[#BBFE03] border-t-transparent rounded-full loading-spin" />
                    </div>

                    <div className="flex h-3 items-center justify-center gap-2 px-2 py-[10px] relative self-stretch w-full bg-[#4d4d4d] rounded-md">
                      <div 
                        className="relative w-fit mt-[-6px] mb-[-4px] [font-family:'Inter',Helvetica] font-normal text-[10px] sm:text-xs tracking-[0] leading-[normal] z-10 rounded-md"
                        style={{ 
                          color: '#000000'
                        }}
                      >
                        {Math.round(coinPercentage)}%
                      </div>

                      <div 
                        className="absolute top-0 left-px h-full bg-[#BBFE03] z-0 rounded-md" 
                        style={{ width: `${coinPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              }) : showFlowAnimation ? Array.from({ length: numCoins || 4 }, (_, index) => {
                  const coinPercentage = getPercentageForCoin(index);
                  const percentageDecimal = coinPercentage / 100;
                  const calculatedValue = investmentAmount && solanaPrice 
                    ? investmentAmount * solanaPrice * percentageDecimal 
                    : 0;
                  const currentValue = `Current Value $${calculatedValue.toFixed(2)}`;
                  
                  const positionArray = flowTokenArrays[index] || [];
                  const scrollPosition = flowScrollPositions[index] || 0;

                  return (
                    <div
                      key={index}
                      className="flex flex-col w-[100px] flex-shrink-0 items-center gap-[12px] relative"
                    >
                      <div className="flex items-center justify-center gap-2 px-2 py-[8px] relative self-stretch w-full flex-[0_0_auto] bg-[#212121] rounded-md">
                        <div className="relative w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-[#eaeaea] text-[10px] tracking-[0] leading-[normal]">
                          {currentValue}
                        </div>
                      </div>

                      {/* Slot machine container */}
                      <div className="relative w-[100px] h-[100px] overflow-hidden">
                        {/* Scrolling token list */}
                        <div
                          className="absolute w-full"
                          style={{
                            transform: `translateY(-${scrollPosition}px)`,
                            willChange: 'transform',
                            transition: 'none'
                          }}
                        >
                          {positionArray.length > 0 ? positionArray.map((token, tokenIndex) => (
                            <div
                              key={tokenIndex}
                              className="w-[100px] h-[100px] bg-cover bg-[50%_50%] relative"
                              style={{ backgroundImage: `url(${token.image || '/frame-3.png'})` }}
                            >
                              {token.name && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                                  <div className="text-white text-[10px] sm:text-[12px] font-normal truncate text-center [font-family:'Inter',Helvetica]">
                                    {token.name}
                                  </div>
                                </div>
                              )}
                            </div>
                          )) : (
                            <div className="w-[100px] h-[100px] bg-[#1a1a1a]" />
                          )}
                        </div>
                      </div>

                      <div className="flex h-3 items-center justify-center gap-2 px-2 py-[10px] relative self-stretch w-full bg-[#4d4d4d] rounded-md">
                        <div 
                          className="relative w-fit mt-[-6px] mb-[-4px] [font-family:'Inter',Helvetica] font-normal text-[10px] sm:text-xs tracking-[0] leading-[normal] z-10 rounded-md"
                          style={{ 
                            color: '#000000'
                          }}
                        >
                          {Math.round(coinPercentage)}%
                        </div>

                        <div 
                          className="absolute top-0 left-px h-full bg-[#BBFE03] z-0 rounded-md" 
                          style={{ width: `${coinPercentage}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (isAnimating || displayTokens.length > 0) ? displayTokens.map((item: Token, index: number) => {
                // Handle Token objects from API
                // Get the percentage for this specific coin
                const coinPercentage = getPercentageForCoin(index);
                // Calculate current value: investmentAmount * solanaPrice * (coinPercentage / 100)
                const percentageDecimal = coinPercentage / 100;
                const calculatedValue = investmentAmount && solanaPrice 
                  ? investmentAmount * solanaPrice * percentageDecimal 
                  : 0;
                const currentValue = `Current Value $${calculatedValue.toFixed(2)}`;
                const image = item.image || '/frame-3.png';               
                
                return (
                <div
                  key={`${item.address || item.name}-${index}`}
                  className={`flex flex-col w-[100px] flex-shrink-0 items-center gap-[12px] relative ${
                    showTokensAnimation && !isAnimating && tokens.length === 0
                      ? 'animate-token-appear'
                      : ''
                  }`}
                  style={{
                    animationDelay: showTokensAnimation && !isAnimating && tokens.length === 0 
                      ? `${index * 0.1}s` 
                      : '0s'
                  }}
                >
                  <div className="flex items-center justify-center gap-2 px-2 py-[8px] relative self-stretch w-full flex-[0_0_auto] bg-[#212121] rounded-md">
                    <div className="relative w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-[#eaeaea] text-[10px] tracking-[0] leading-[normal]">
                      {currentValue}
                    </div>
                  </div>

                    <div
                    className="w-[100px] h-[100px] bg-cover bg-[50%_50%] relative"
                    style={{ backgroundImage: `url(${image})` }}
                    >
                    {item.name && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                        <div className="text-white text-[10px] sm:text-[12px] font-normal truncate text-center [font-family:'Inter',Helvetica]">
                          {item.name}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex h-3 items-center justify-center gap-2 px-2 py-[10px] relative self-stretch w-full bg-[#4d4d4d] rounded-md">
                    <div 
                      className="relative w-fit mt-[-6px] mb-[-4px] [font-family:'Inter',Helvetica] font-normal text-[10px] sm:text-xs tracking-[0] leading-[normal] z-10 rounded-md"
                      style={{ 
                        color: '#000000'
                      }}
                    >
                      {Math.round(coinPercentage)}%
                    </div>

                    <div 
                      className="absolute top-0 left-px h-full bg-[#BBFE03] z-0 rounded-md" 
                      style={{ width: `${coinPercentage}%` }}
                    />
                  </div>
                </div>
                );
              }) : (isAnimating || displayTokens.length > 0) ? displayTokens.map((item: Token, index: number) => {
                const coinPercentage = getPercentageForCoin(index);
                const percentageDecimal = coinPercentage / 100;
                const calculatedValue = investmentAmount && solanaPrice 
                  ? investmentAmount * solanaPrice * percentageDecimal 
                  : 0;
                const currentValue = `Current Value $${calculatedValue.toFixed(2)}`;
                const image = item.image || '/frame-3.png';
                
                return (
                  <div
                    key={`${item.address || item.name}-${index}`}
                    className={`flex flex-col w-[100px] flex-shrink-0 items-center gap-[12px] relative ${
                      showTokensAnimation && !isAnimating && tokens.length === 0
                        ? 'animate-token-appear'
                        : ''
                    }`}
                    style={{
                      animationDelay: showTokensAnimation && !isAnimating && tokens.length === 0 
                        ? `${index * 0.1}s` 
                        : '0s'
                    }}
                  >
                    <div className="flex items-center justify-center gap-2 px-2 py-[8px] relative self-stretch w-full flex-[0_0_auto] bg-[#212121] rounded-md">
                      <div className="relative w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-[#eaeaea] text-[10px] tracking-[0] leading-[normal]">
                        {currentValue}
                      </div>
                    </div>

                    <div
                      className="w-[100px] h-[100px] bg-cover bg-[50%_50%] relative"
                      style={{ backgroundImage: `url(${image})` }}
                    >
                      {item.name && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                          <div className="text-white text-[10px] sm:text-[12px] font-normal truncate text-center [font-family:'Inter',Helvetica]">
                            {item.name}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex h-3 items-center justify-center gap-2 px-2 py-[10px] relative self-stretch w-full bg-[#4d4d4d] rounded-md">
                      <div 
                        className="relative w-fit mt-[-6px] mb-[-4px] [font-family:'Inter',Helvetica] font-normal text-[10px] sm:text-xs tracking-[0] leading-[normal] z-10 rounded-md"
                        style={{ 
                          color: '#000000'
                        }}
                      >
                        {Math.round(coinPercentage)}%
                      </div>

                      <div 
                        className="absolute top-0 left-px h-full bg-[#BBFE03] z-0 rounded-md" 
                        style={{ width: `${coinPercentage}%` }}
                      />
                    </div>
                </div>
                );
              }) : null
              }
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-2.5 py-3 sm:py-[9px] relative self-stretch w-full flex-[0_0_auto] bg-black gap-3 sm:gap-0 mt-6">
            <div className="flex w-full sm:w-[392.48px] items-center gap-3 relative justify-center sm:justify-start">
              <img
                className="relative w-[7px] h-[7px]"
                alt="Rectangle"
                src="/Rectangle.svg"
              />

              <div className="relative w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[19.5px]">
                Live Total Value: <br />
                0.12 SOL
              </div>
            </div>

            <Button 
              onClick={handleMoveToPortfolio}
              disabled={!currentCrate}
              className="h-auto inline-flex items-center justify-center gap-2.5 p-2 sm:p-2.5 relative flex-[0_0_auto] bg-[#BBFE03] hover:bg-[#BBFE03]/90 w-full sm:w-auto disabled:bg-[#BBFE03]/50 disabled:cursor-not-allowed"
            >
              <div className="relative w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] px-4 py-2 rounded-md font-normal text-black text-sm sm:text-base tracking-[0] leading-[normal] whitespace-nowrap">
                Move to Portfolio
              </div>
            </Button>
          </div>

          <img
            className="hidden lg:block absolute top-[237px] right-[127px] w-[54px] h-[54px]"
            alt="Rectangle"
            src="/right.svg"
          />

          <img
            className="hidden lg:block absolute top-[237px] left-[122px] w-[54px] h-[54px]"
            alt="Rectangle"
            src="/left.svg"
          />
        </div> 
      </div>   
    </section>
    </>
  );
};
