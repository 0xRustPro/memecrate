import React, { useState, useEffect, useRef } from "react";
import { Button } from "../../components/ui/button";
import { apiService, Token } from "../../services/api";
import { useWallet } from "@solana/wallet-adapter-react";

interface SelectTokenProps {
  onBack: () => void;
  numCoins: number;
  selectedTheme: string;
  selectedContractTheme?: string;
  investmentAmount: number;
  solanaPrice: number | null;
  allocationType: string;
  coinPercentages: number[];
  onConfirm: (tokens: Token[]) => void;
  onCreateCrate: () => Promise<void>; // Function to create crate and start transaction
}

export const SelectToken = ({ 
  onBack, 
  numCoins, 
  selectedTheme, 
  selectedContractTheme,
  investmentAmount,
  solanaPrice,
  allocationType,
  coinPercentages,
  onConfirm,
  onCreateCrate
}: SelectTokenProps): JSX.Element => {
  const { publicKey } = useWallet();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [tokenArrays, setTokenArrays] = useState<Token[][]>([]); // Array of token arrays for each position
  const [scrollPositions, setScrollPositions] = useState<number[]>([]); // Scroll position for each slot
  const baseScrollPositionsRef = useRef<number[]>([]); // Base scroll positions that only increase
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set()); // Track loaded images
  const rerollAnimationFrameRef = useRef<number | null>(null); // Animation frame for reroll
  const [rerollingSlot, setRerollingSlot] = useState<number | null>(null); // Track which slot is currently rerolling (state for immediate re-render)

  // Fetch tokens from backend and start animation
  useEffect(() => {
    const fetchTokensAndAnimate = async () => {
      if (!publicKey || !numCoins || ![2, 4, 6, 8].includes(numCoins)) {
        setLoading(false);
        setIsAnimating(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setIsAnimating(true);
        const theme = selectedContractTheme || selectedTheme || 'celebrities';
        
        // Fetch final selected tokens
        const response = await apiService.getCachedTokens(
          publicKey.toString(),
          theme,
          numCoins
        );

        if (!response.success || !response.tokens) {
          throw new Error('Failed to fetch tokens');
        }

        const finalTokens = response.tokens;
        setTokens(finalTokens);

        // Fetch multiple batches of random tokens for animation
        const batchRequests = [
          apiService.getRandomTokens(8, theme),
          apiService.getRandomTokens(8, theme),
          apiService.getRandomTokens(8, theme),
          apiService.getRandomTokens(4, theme),
        ];
        
        const batchResponses = await Promise.all(batchRequests);
        const allRandomTokens: Token[] = [];
        
        batchResponses.forEach(response => {
          if (response.success && response.tokens) {
            allRandomTokens.push(...response.tokens);
          }
        });

        // Create token arrays for each position (slot machine style)
        // Each position has: [random tokens...] + [final token]
        const arrays: Token[][] = [];
        const initialScrollPositions: number[] = [];
        
        for (let i = 0; i < numCoins; i++) {
          // Create array with exactly 20 tokens: 19 random + 1 final
          const positionArray: Token[] = [];
          
          // Add 19 random tokens
          for (let j = 0; j < 19; j++) {
            const randomIndex = Math.floor(Math.random() * allRandomTokens.length);
            positionArray.push(allRandomTokens[randomIndex] || {
              category: '',
              name: `Token ${j}`,
              address: '',
              image: '/frame-3.png'
            });
          }
          
          // Add final token at the end (20th token)
          positionArray.push(finalTokens[i]);
          
          arrays.push(positionArray);
          // Start scroll position at 0 (top)
          initialScrollPositions.push(0);
        }
        
        setTokenArrays(arrays);
        setScrollPositions(initialScrollPositions);
        baseScrollPositionsRef.current = new Array(numCoins).fill(0); // Initialize base positions

        // Start slot machine animation - automatically finish when reaching final token
        const tokenHeight = 110; // Height of each token in pixels
        const totalTokens = 20; // Total tokens per array
        const finalTokenIndex = totalTokens - 1; // Index of final token (19)
        const finalPos = finalTokenIndex * tokenHeight; // Final position (1900px)
        
        // Different start delays for each slot (staggered timing)
        const slotDelays = arrays.map((_, index) => index * 110); // 100ms delay between slots
        
        let startTime = performance.now();
        let lastFrameTime = startTime;
        let animationFrame: number | null = null;
        let allFinished = false;
        
        const animate = (currentTime: number) => {
          if (allFinished) return;
          
          const elapsed = currentTime - startTime;
          const deltaTime = currentTime - lastFrameTime;
          lastFrameTime = currentTime;
          
          // Update scroll positions for each slot
          setScrollPositions(prev => {
            let allSlotsFinished = true;
            
            const newPositions = prev.map((pos, index) => {
              const slotDelay = slotDelays[index];
              const slotElapsed = Math.max(0, elapsed - slotDelay);
              
              if (slotElapsed <= 0) {
                return 0; // Slot hasn't started yet
              }
              
              // Calculate scroll speed - slow down as approaching final token
              const currentPos = baseScrollPositionsRef.current[index] || 0;
              const distanceToFinal = finalPos - currentPos;
              
              // Speed calculation: fast at start, slow down near the end
              let pixelsPerMs: number;
              if (distanceToFinal > 1000) {
                // Far from final: moderate speed
                pixelsPerMs = 0.2; // 200px per second
              } else if (distanceToFinal > 500) {
                // Medium distance: medium speed
                pixelsPerMs = 0.15; // 150px per second
              } else if (distanceToFinal > 200) {
                // Close to final: slow down
                pixelsPerMs = 0.05; // 100px per second
              } else if (distanceToFinal > 50) {
                // Very close: very slow
                pixelsPerMs = 0.03; // 50px per second
              } else {
                // Almost there: crawl
                pixelsPerMs = 0.02; // Gradually slow to 0
              }
              
              // Update base position (only increase, never decrease)
              const pixelsToAdd = pixelsPerMs * deltaTime;
              const newBasePos = Math.min(currentPos + pixelsToAdd, finalPos);
              
              if (newBasePos > baseScrollPositionsRef.current[index]) {
                baseScrollPositionsRef.current[index] = newBasePos;
              }
              
              const basePos = baseScrollPositionsRef.current[index];
              
              // Check if this slot has reached the final position
              if (basePos >= finalPos) {
                return finalPos; // Lock to final position
              } else {
                allSlotsFinished = false;
                return basePos;
              }
            });
            
            // Check if all slots have finished
            if (allSlotsFinished && newPositions.every(pos => pos >= finalPos)) {
              allFinished = true;
              setIsAnimating(false);
              setLoading(false);
            }
            
            return newPositions;
          });
          
          if (!allFinished) {
            animationFrame = requestAnimationFrame(animate);
          }
        };
        
        animationFrame = requestAnimationFrame(animate);
        
        return () => {
          if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
          }
          // Cleanup reroll animation if exists
          if (rerollAnimationFrameRef.current !== null) {
            cancelAnimationFrame(rerollAnimationFrameRef.current);
            rerollAnimationFrameRef.current = null;
          }
          setRerollingSlot(null);
        };
      } catch (err: any) {
        console.error('Error fetching tokens:', err);
        setError(err.message || 'Failed to fetch tokens');
        setIsAnimating(false);
        setLoading(false);
        // Initialize with empty tokens
        setTokens(Array.from({ length: numCoins }, () => ({
          category: '',
          name: '',
          address: '',
          image: ''
        })));
      }
    };

    fetchTokensAndAnimate();
  }, [publicKey, numCoins, selectedTheme, selectedContractTheme]);

  // Handle reroll for a specific token with animation
  const handleReroll = async (tokenIndex: number) => {
    if (!publicKey || (!selectedContractTheme && !selectedTheme)) {
      return;
    }

    try {
      const theme = selectedContractTheme || selectedTheme || 'celebrities';
      
      // Set rerolling state for this slot (immediately disable button)
      setRerollingSlot(tokenIndex);
      
      // Fetch new random tokens for animation
      const batchRequests = [
        apiService.getRandomTokens(8, theme),
        apiService.getRandomTokens(8, theme),
        apiService.getRandomTokens(4, theme),
      ];
      
      const batchResponses = await Promise.all(batchRequests);
      const allRandomTokens: Token[] = [];
      
      batchResponses.forEach(response => {
        if (response.success && response.tokens) {
          allRandomTokens.push(...response.tokens);
        }
      });

      // Fetch the new token from backend
      const response = await apiService.rerollSingleToken(
        publicKey.toString(),
        theme,
        tokenIndex,
        tokens
      );

      if (response.success && response.token) {
        // Create new token array for this position: 19 random + 1 final
        const newPositionArray: Token[] = [];
        
        // Add 19 random tokens
        for (let j = 0; j < 19; j++) {
          const randomIndex = Math.floor(Math.random() * allRandomTokens.length);
          newPositionArray.push(allRandomTokens[randomIndex] || {
            category: '',
            name: `Token ${j}`,
            address: '',
            image: '/frame-3.png'
          });
        }
        
        // Add final token at the end (20th token)
        newPositionArray.push(response.token);
        
        // Update tokenArrays for this specific position
        setTokenArrays(prev => {
          const newArrays = [...prev];
          newArrays[tokenIndex] = newPositionArray;
          return newArrays;
        });
        
        // Reset scroll position for this slot to start animation from top
        setScrollPositions(prev => {
          const newPositions = [...prev];
          newPositions[tokenIndex] = 0;
          return newPositions;
        });
        
        baseScrollPositionsRef.current[tokenIndex] = 0;
        
        // Start animation for this specific slot
        startRerollAnimation(tokenIndex, response.token);
      }
    } catch (error: any) {
      console.error("Reroll failed:", error);
      alert(error.message || "Failed to reroll token. Please try again.");
      setRerollingSlot(null);
    }
  };

  // Start slot machine animation for a specific rerolled token
  const startRerollAnimation = (tokenIndex: number, finalToken: Token) => {
    const tokenHeight = 110;
    const totalTokens = 20;
    const finalTokenIndex = totalTokens - 1;
    const finalPos = finalTokenIndex * tokenHeight;
    
    let startTime = performance.now();
    let lastFrameTime = startTime;
    let animationFrame: number | null = null;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      
      setScrollPositions(prev => {
        const newPositions = [...prev];
        const currentPos = baseScrollPositionsRef.current[tokenIndex] || 0;
        const distanceToFinal = finalPos - currentPos;
        
        // Speed calculation: fast at start, slow down near the end
        let pixelsPerMs: number;
        if (distanceToFinal > 1000) {
          pixelsPerMs = 0.2;
        } else if (distanceToFinal > 500) {
          pixelsPerMs = 0.15;
        } else if (distanceToFinal > 200) {
          pixelsPerMs = 0.1;
        } else if (distanceToFinal > 50) {
          pixelsPerMs = 0.1;
        } else {
          pixelsPerMs = 0.1;
        }
        
        // Update base position (only increase, never decrease)
        const pixelsToAdd = pixelsPerMs * deltaTime;
        const newBasePos = Math.min(currentPos + pixelsToAdd, finalPos);
        
        if (newBasePos > baseScrollPositionsRef.current[tokenIndex]) {
          baseScrollPositionsRef.current[tokenIndex] = newBasePos;
        }
        
        const basePos = baseScrollPositionsRef.current[tokenIndex];
        
        // Check if reached final position
        if (basePos >= finalPos) {
          // Animation complete - update tokens state with final token
          setTokens(prevTokens => {
            const newTokens = [...prevTokens];
            newTokens[tokenIndex] = finalToken;
            return newTokens;
          });
          // Clear rerolling state to enable button
          setRerollingSlot(null);
          // Ensure scroll position is exactly at final position
          baseScrollPositionsRef.current[tokenIndex] = finalPos;
          if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
            rerollAnimationFrameRef.current = null;
          }
          return newPositions.map((pos, idx) => idx === tokenIndex ? finalPos : pos);
        } else {
          newPositions[tokenIndex] = basePos;
          return newPositions;
        }
      });
      
      // Continue animation if not reached final
      const currentPos = baseScrollPositionsRef.current[tokenIndex] || 0;
      if (currentPos < finalPos) {
        animationFrame = requestAnimationFrame(animate);
        rerollAnimationFrameRef.current = animationFrame;
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    rerollAnimationFrameRef.current = animationFrame;
  };

  // Calculate percentage per coin
  const getPercentageForCoin = (index: number): number => {
    if (allocationType === "random" && coinPercentages && coinPercentages.length > index) {
      return coinPercentages[index];
    }
    return tokens.length > 0 ? 110 / tokens.length : 0;
  };

  // Handle confirm - save tokens, close modal, and start transaction
  const handleConfirm = async () => {
    if (tokens.length > 0 && tokens.every(t => t.name && t.image)) {
      // Save tokens
      onConfirm(tokens);
      // Close modal
      onBack();
      // Start transaction (this will trigger wallet sign modal)
      try {
        await onCreateCrate();
      } catch (error: any) {
        console.error('Error creating crate:', error);
        alert(error.message || 'Failed to create crate. Please try again.');
      }
    } else {
      alert("Please wait for all tokens to load");
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideDown {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out forwards;
        }
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        .loading-shimmer {
          background: linear-gradient(
            90deg,
            #1a1a1a 0%,
            #2a2a2a 50%,
            #1a1a1a 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.8;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .loading-pulse {
          animation: pulse 1.5s ease-in-out infinite;
          background: #1a1a1a;
        }
        .loading-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/80"
          onClick={onBack}
        />
        
        {/* Modal Content */}
        <div className="relative w-[90%] h-[360px] flex flex-col items-center justify-center overflow-hidden bg-black">
        <h1 className="text-white text-2xl mb-4">Select Tokens</h1>
        
        {loading && !isAnimating ? (
          <p className="text-white text-xl">Loading tokens...</p>
        ) : error ? (
          <p className="text-yellow-500 text-sm">{error}</p>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-4 px-4 overflow-y-auto max-h-[240px]">
              {Array.from({ length: numCoins }, (_, index) => {
                const coinPercentage = getPercentageForCoin(index);
                const percentageDecimal = coinPercentage / 100;
                const calculatedValue = investmentAmount && solanaPrice 
                  ? investmentAmount * solanaPrice * percentageDecimal 
                  : 0;
                const currentValue = `Current Value $${calculatedValue.toFixed(2)}`;
                
                // Get token array for this position
                const positionArray = tokenArrays[index] || [];
                const scrollPosition = scrollPositions[index] || 0;
                const tokenHeight = 110;
                const totalTokens = 20;
                const finalTokenIndex = totalTokens - 1; // Index 19 (20th token)
                const finalPos = finalTokenIndex * tokenHeight; // Final position (1900px)
                // Calculate which token is currently visible
                const visibleTokenIndex = Math.floor(scrollPosition / tokenHeight);
                // Check if this slot is currently rerolling
                const isRerolling = rerollingSlot === index;
                // Button becomes clickable when we're showing the final token (index 19) or animation finished, and not rerolling
                const hasReachedFinal = (visibleTokenIndex >= finalTokenIndex || (!isAnimating && positionArray.length === totalTokens)) && !isRerolling;

                return (
                  <div
                    key={index}
                    className="flex flex-col w-[110px] flex-shrink-0 items-center gap-[12px] relative"
                  >
                    <div className="flex items-center justify-center gap-2 px-2 py-[8px] relative self-stretch w-full flex-[0_0_auto] bg-[#212121] rounded-md">
                      <div className="relative w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-[#eaeaea] text-[10px] tracking-[0] leading-[normal]">
                        {currentValue}
                      </div>
                    </div>

                    {/* Slot machine container */}
                    <div className="relative w-[110px] h-[110px] overflow-hidden">
                      {/* Scrolling token list */}
                      <div
                        className="absolute w-full"
                        style={{
                          transform: `translateY(-${scrollPosition}px)`,
                          willChange: 'transform',
                          transition: (isAnimating || isRerolling) ? 'none' : 'transform 0.3s ease-out'
                        }}
                      >
                        {positionArray.length > 0 ? positionArray.map((token, tokenIndex) => {
                          const imageUrl = token.image;
                          const imageKey = `${index}-${tokenIndex}-${imageUrl}`;
                          const isImageLoaded = loadedImages.has(imageKey);
                          const hasValidImage = imageUrl && imageUrl !== '/frame-3.png' && imageUrl !== '';
                          const isLoading = !hasValidImage || !isImageLoaded;
                          
                          return (
                            <div
                              key={tokenIndex}
                              className={`w-[110px] h-[110px] relative ${isLoading ? 'loading-shimmer' : 'bg-cover bg-[50%_50%]'}`}
                              style={!isLoading && hasValidImage ? { backgroundImage: `url(${imageUrl})` } : {}}
                            >
                              {hasValidImage && !isImageLoaded && (
                                <img
                                  src={imageUrl}
                                  alt=""
                                  className="hidden"
                                  onLoad={() => {
                                    setLoadedImages(prev => new Set(prev).add(imageKey));
                                  }}
                                  onError={() => {
                                    // If image fails to load, mark as loaded to stop loading animation
                                    setLoadedImages(prev => new Set(prev).add(imageKey));
                                  }}
                                />
                              )}
                              {isLoading && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-8 h-8 border-2 border-[#BBFE03] border-t-transparent rounded-full loading-spin" />
                                </div>
                              )}
                              {/* Token name overlay */}
                              {!isLoading && token.name && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                                  <div className="text-white text-[12px] font-normal truncate text-center [font-family:'Inter',Helvetica]">
                                    {token.name}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }) : (
                          <div className="w-[110px] h-[110px] loading-shimmer flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-[#BBFE03] border-t-transparent rounded-full loading-spin" />
                          </div>
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

                    <Button
                      variant="outline"
                      onClick={() => handleReroll(index)}
                      disabled={!publicKey || !hasReachedFinal}
                      className="h-auto justify-center px-2 py-[5px] relative self-stretch w-full flex-[0_0_auto] border border-solid border-[#BBFE03] bg-transparent hover:bg-[#BBFE03]/10 disabled:bg-[#BBFE03]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="relative w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-[#BBFE03] text-[10px] sm:text-xs tracking-[0] leading-[normal]">
                        Reroll (0.001 SOL)
                      </div>
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button
              onClick={handleConfirm}
              disabled={loading || tokens.length === 0 || !tokens.every(t => t.name && t.image) || scrollPositions.some((pos) => pos < (19 * 100))}
              className="mt-4 h-auto px-4 py-2 bg-[#BBFE03] hover:bg-[#BBFE03]/90 disabled:bg-[#BBFE03]/50 disabled:cursor-not-allowed [font-family:'Inter',Helvetica] font-normal text-black tracking-[0] leading-[normal] rounded-md"
            >
              Confirm Craft
            </Button>
          </>
        )}
        </div>
      </div>
    </>
  );
};

