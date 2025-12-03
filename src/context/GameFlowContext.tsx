import React, { createContext, useContext, useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { apiService } from "../services/api";
import { buildAndSendTransaction } from "../utils/transactions";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

export enum GameFlowStep {
  CHOOSE_AMOUNT = "CHOOSE_AMOUNT",
  PICK_CATEGORY = "PICK_CATEGORY",
  CHOOSE_COINS = "CHOOSE_COINS",
  CHOOSE_ALLOCATION = "CHOOSE_ALLOCATION",
  CONFIRM_CHOICES = "CONFIRM_CHOICES",
  ROLLING = "ROLLING",
  ROLLING_COMPLETE = "ROLLING_COMPLETE",
  REROLL = "REROLL",
  PORTFOLIO = "PORTFOLIO",
  CASH_OUT = "CASH_OUT",
  SUCCESS = "SUCCESS",
}

export interface CrateData {
  crateId: number;
  cratePDA: string;
  coins: Array<{
    coinId: number;
    allocation: number;
  }>;
  investmentAmount: number;
  theme: string;
  numCoins: number;
  splitType: string;
}

interface GameFlowContextValue {
  // Current state
  currentStep: GameFlowStep;
  setCurrentStep: (step: GameFlowStep) => void;
  
  // User selections
  investmentAmount: number;
  setInvestmentAmount: (amount: number) => void;
  selectedTheme: string | null;
  setSelectedTheme: (theme: string | null) => void;
  selectedContractTheme: string | null; // Contract theme from selected category
  setSelectedContractTheme: (theme: string | null) => void;
  numCoins: number;
  setNumCoins: (num: number) => void;
  allocationType: "equal" | "random";
  setAllocationType: (type: "equal" | "random") => void;
  coinPercentages: number[] | null;
  setCoinPercentages: (percentages: number[] | null) => void;
  
  // Crate data
  currentCrate: CrateData | null;
  setCurrentCrate: (crate: CrateData | null) => void;
  
  // Animation state
  isRolling: boolean;
  setIsRolling: (rolling: boolean) => void;
  
  // Transaction state
  isProcessing: boolean;
  transactionSignature: string | null;
  error: string | null;
  
  // Displayed tokens state
  displayedTokens: any[];
  setDisplayedTokens: (tokens: any[]) => void;
  rerollCount: number;
  setRerollCount: (count: number) => void;
  
  // Actions
  createCrate: () => Promise<void>;
  rerollCoins: (slotIndices: number[]) => Promise<void>;
  confirmCrate: () => Promise<void>;
  sellCrate: (expectedReturn: number, crateId?: number) => Promise<any>;
  
  // Reset
  resetFlow: () => void;
  
  // Clear error
  clearError: () => void;
}

const GameFlowContext = createContext<GameFlowContextValue | undefined>(undefined);

// Theme mapping from display names to contract themes
const THEME_MAP: Record<string, string> = {
  "PolitiFi": "celebrities",
  "Animals": "animals",
  "Gaming": "ogMemes",
  "Sports": "pepe",
  "Music": "food",
  "Celebrities": "celebrities",
  "OG Memes": "ogMemes",
  "Pepe": "pepe",
  "Food": "food",
  "Mixed": "mixed",
};

// Helper to get contract theme from category name
const getContractTheme = (categoryName: string): string => {
  // First check direct mapping
  if (THEME_MAP[categoryName]) {
    return THEME_MAP[categoryName];
  }
  // Default fallback
  return categoryName.toLowerCase();
};

export const GameFlowProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [currentStep, setCurrentStep] = useState<GameFlowStep>(GameFlowStep.CHOOSE_AMOUNT);
  const [investmentAmount, setInvestmentAmount] = useState<number>(0.5);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedContractTheme, setSelectedContractTheme] = useState<string | null>(null);
  const [numCoins, setNumCoins] = useState<number>(4);
  const [allocationType, setAllocationType] = useState<"equal" | "random">("equal");
  const [coinPercentages, setCoinPercentages] = useState<number[] | null>(null);
  const [currentCrate, setCurrentCrate] = useState<CrateData | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const [displayedTokens, setDisplayedTokens] = useState<any[]>([]); // Tokens displayed after Craft Crate
  const [rerollCount, setRerollCount] = useState(0); // Track reroll count
  const [error, setError] = useState<string | null>(null);

  const createCrate = useCallback(async () => {
    if (!publicKey) {
      // Don't set error - WalletErrorModal will handle display
      return;
    }

    if (!investmentAmount || investmentAmount <= 0) {
      setError("Please enter a valid investment amount");
      return;
    }

    if (!selectedTheme) {
      setError("Please select a category");
      return;
    }

    if (![2, 4, 6, 8].includes(numCoins)) {
      setError("Please select 2, 4, 6, or 8 coins");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Get selected tokens - use displayedTokens if available, otherwise fetch from backend
      if (!connection || !signTransaction || !publicKey) {
        throw new Error("Wallet not connected");
      }

      const theme = selectedContractTheme || selectedTheme;
      let selectedTokens: any[];
      
      // If displayedTokens exist (from "Craft Crate"), use those - they are the selected tokens
      if (displayedTokens && displayedTokens.length > 0 && displayedTokens.length === numCoins) {
        console.log('🎲 Using displayed tokens (from Craft Crate):', displayedTokens.map(t => t.name));
        selectedTokens = displayedTokens;
      } else {
        // Otherwise, fetch from backend
        console.log('🎲 Fetching cached tokens for category:', theme, 'numCoins:', numCoins);
        const tokensResponse = await apiService.getCachedTokens(publicKey.toString(), theme, numCoins);
        
        if (!tokensResponse.success || !tokensResponse.tokens || tokensResponse.tokens.length === 0) {
          throw new Error('Failed to fetch tokens');
        }

        selectedTokens = tokensResponse.tokens;
        console.log(`✅ Retrieved tokens (fromCache: ${tokensResponse.fromCache}):`, selectedTokens.map(t => t.name));
        
        // Also set as displayedTokens so they're shown in PortfolioSection
        setDisplayedTokens(selectedTokens);
      }
      
      console.log('✅ Selected tokens for purchase:', selectedTokens.map(t => t.name));

      // Step 2: Calculate buy amounts for each token
      let buyAmounts: number[] = [];
      if (allocationType === 'equal') {
        // Equal split
        const amountPerToken = investmentAmount / numCoins;
        buyAmounts = Array(numCoins).fill(amountPerToken);
      } else {
        // Random split (use coinPercentages if available)
        if (coinPercentages && coinPercentages.length === numCoins) {
          buyAmounts = coinPercentages.map(percentage => (investmentAmount * percentage) / 100);
        } else {
          // Fallback to equal split
          const amountPerToken = investmentAmount / numCoins;
          buyAmounts = Array(numCoins).fill(amountPerToken);
        }
      }

      // Step 3: Prepare tokens with buy amounts
      const tokensWithAmounts = selectedTokens.map((token, index) => ({
        mintAddress: token.address,
        tokenName: token.name,
        tokenImage: token.image,
        buyAmountSol: buyAmounts[index],
      }));

      console.log('💰 Buy amounts:', buyAmounts);

      // Step 4: Call backend createCrate to get generated wallet and transaction
      console.log('📞 [FRONTEND] Calling backend createCrate with tokens:', tokensWithAmounts.map(t => t.tokenName));
      let crateResponse: any;
      try {
        crateResponse = await apiService.createCrate({
          investmentAmount,
          theme: selectedContractTheme || selectedTheme || 'celebrities',
          numCoins: numCoins as 2 | 4 | 6 | 8,
          splitType: allocationType,
          userPublicKey: publicKey.toString(),
          tokens: tokensWithAmounts // Send the selected tokens to backend
        });
        console.log('✅ [FRONTEND] Received response from backend');
      } catch (apiError: any) {
        console.error('❌ [FRONTEND] Error calling backend:', apiError);
        if (apiError.message?.includes('ERR_EMPTY_RESPONSE') || apiError.message?.includes('Failed to fetch')) {
          throw new Error('Backend server is not responding. Please check if the server is running and try again.');
        }
        throw new Error(`Failed to create crate: ${apiError.message || 'Unknown error'}`);
      }

      if (!crateResponse || !crateResponse.success || !crateResponse.generatedWalletPublicKey) {
        throw new Error('Failed to create crate or get generated wallet from backend');
      }

      const generatedWalletPublicKey = crateResponse.generatedWalletPublicKey;
      const purchaseId = crateResponse.purchaseId;
      const responseTokens = crateResponse.tokens || tokensWithAmounts;
      console.log('✅ Generated wallet:', generatedWalletPublicKey.slice(0, 8) + '...');
      console.log('✅ Purchase ID:', purchaseId);
      console.log('✅ Tokens from backend response:', responseTokens.map((t: any) => t.tokenName));
      
      // Update displayedTokens with tokens from backend response to ensure consistency
      const formattedResponseTokens = responseTokens.map((t: any) => ({
        address: t.mintAddress,
        name: t.tokenName,
        image: t.tokenImage,
        buyAmountSol: t.buyAmountSol
      }));
      setDisplayedTokens(formattedResponseTokens);
      console.log('✅ Updated displayedTokens with backend response tokens');
      
      // Step 5: Create transaction in frontend and sign with wallet
      console.log('📝 Creating SOL transfer transaction in frontend...');
      
      // Check if wallet is connected
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      // Calculate SOL to send (add small buffer for transaction fees + reroll fees)
      const rerollFee = rerollCount * 0.001; // 0.001 SOL per reroll
      const solToSend = investmentAmount + 0.02 + rerollFee;
      const lamportsToSend = Math.floor(solToSend * LAMPORTS_PER_SOL);

      // Get minimum rent-exempt balance for a basic account
      const minimumRentExemptBalance = await connection.getMinimumBalanceForRentExemption(0);
      console.log(`💰 Minimum rent-exempt balance: ${minimumRentExemptBalance} lamports (${(minimumRentExemptBalance / LAMPORTS_PER_SOL).toFixed(9)} SOL)`);

      // Check if generated wallet account exists
      const generatedWalletPubkey = new PublicKey(generatedWalletPublicKey);
      const accountInfo = await connection.getAccountInfo(generatedWalletPubkey);
      const accountExists = accountInfo !== null;
      console.log(`📋 Generated wallet account exists: ${accountExists}`);

      // Create SOL transfer transaction (without blockhash yet)
      const transaction = new Transaction();

      // If account doesn't exist, add rent-exempt balance transfer first (auto-creates account)
      if (!accountExists) {
        console.log('🏗️  Adding rent-exempt balance transfer (will auto-create account)...');
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: generatedWalletPubkey,
            lamports: minimumRentExemptBalance,
          })
        );
      }

      // Add main SOL transfer instruction
      console.log(`💸 Adding SOL transfer: ${lamportsToSend} lamports (${solToSend.toFixed(4)} SOL)`);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: generatedWalletPubkey,
          lamports: lamportsToSend,
        })
      );

      transaction.feePayer = publicKey;

      console.log('📝 Transaction created, requesting wallet signature...');
      console.log('📝 Wallet modal should appear now - please sign the transaction');
      
      // Get fresh blockhash right before signing to prevent expiration
      console.log('🔄 Getting fresh blockhash before signing...');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      console.log(`✅ Fresh blockhash obtained: ${blockhash.slice(0, 8)}...`);
      
      // Sign transaction with user's wallet (this will show wallet modal)
      let signedTransaction: Transaction;
      try {
        signedTransaction = await signTransaction(transaction);
        console.log('✅ Transaction signed successfully by user');
      } catch (signError: any) {
        console.error('❌ Transaction signing failed:', signError);
        if (signError.message?.includes('reject') || signError.message?.includes('denied')) {
          throw new Error('Transaction was rejected by user');
        }
        throw new Error(`Failed to sign transaction: ${signError.message || 'Unknown error'}`);
      }
      
      // Serialize signed transaction to base64 (browser-compatible)
      const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      };
      
      const signedTransactionBase64 = uint8ArrayToBase64(signedTransaction.serialize());
      
      console.log('📤 Sending signed transaction to backend...');
      
      // Send signed transaction to backend (with purchaseId to buy only new tokens and rerollCount for initialInvestment calculation)
      const submitResponse = await apiService.submitSignedTransaction(
        signedTransactionBase64,
        blockhash,
        lastValidBlockHeight,
        purchaseId, // Pass purchaseId so backend only buys new tokens
        rerollCount // Pass rerollCount to calculate initialInvestment (sum of buyAmountSol + 0.02 fee + reroll fees)
      );
      
      if (!submitResponse.success || !submitResponse.signature) {
        throw new Error('Failed to submit signed transaction');
      }

      console.log('✅ Transaction signature:', submitResponse.signature);
      setTransactionSignature(submitResponse.signature);

      // Step 6: Create crate data with selected tokens
      const coins = tokensWithAmounts.map((token, index) => ({
        coinId: index + 1,
        allocation: token.buyAmountSol,
      }));

      setCurrentCrate({
        crateId: 0,
        cratePDA: generatedWalletPublicKey,
        coins,
        investmentAmount,
        theme: selectedTheme,
        numCoins,
        splitType: allocationType,
      });

      // Move to rolling step
      setCurrentStep(GameFlowStep.ROLLING);
      
      // After animation, fetch actual purchased tokens from DB and update displayedTokens
      setTimeout(async () => {
        setCurrentStep(GameFlowStep.ROLLING_COMPLETE);
        
        // Fetch actual purchased tokens from database to ensure consistency
        try {
          console.log('📦 Fetching purchased tokens from database for purchaseId:', purchaseId);
          const walletResponse = await apiService.getUserWallet(publicKey.toString());
          
          if (walletResponse.success && walletResponse.wallet?.tokenPurchases) {
            // Find the purchase with matching purchaseId
            const purchase = walletResponse.wallet.tokenPurchases.find(
              (p: any) => p.purchaseId === purchaseId
            );
            
            if (purchase && purchase.tokens && purchase.tokens.length > 0) {
              // Format tokens from DB to match displayedTokens format
              const dbTokens = purchase.tokens.map((token: any) => ({
                address: token.mintAddress,
                name: token.tokenName,
                image: token.tokenImage,
                buyAmountSol: token.buyAmountSol
              }));
              
              console.log('✅ Loaded purchased tokens from DB:', dbTokens.map((t: any) => t.name));
              setDisplayedTokens(dbTokens);
              console.log('✅ Updated displayedTokens with actual purchased tokens from database');
            } else {
              console.warn('⚠️ Purchase not found in database or has no tokens');
              // Keep displayedTokens as is (from backend response)
            }
          } else {
            console.warn('⚠️ Failed to fetch wallet data from database');
            // Keep displayedTokens as is (from backend response)
          }
        } catch (error: any) {
          console.error('❌ Error fetching purchased tokens from database:', error);
          // Keep displayedTokens as is (from backend response) on error
        }
        
        // Reset rerollCount after purchase completes
        setRerollCount(0);
        console.log('✅ Purchase complete - updated displayedTokens from DB and reset rerollCount');
      }, 3000);
    } catch (err: any) {
      console.error('❌ [CREATE CRATE] Error:', err);
      
      // Handle specific error cases
      if (err.message?.includes('reject') || err.message?.includes('denied') || err.message?.includes('User rejected')) {
        // Don't display error for cancelled transactions - user intentionally cancelled
        // setError('Transaction was cancelled. Please try again when ready.');
      } else if (err.message?.includes('Wallet not connected')) {
        // Don't set error - WalletErrorModal will handle display
      } else if (err.message?.includes('Missing transaction')) {
        setError('Failed to receive transaction from server. Please try again.');
      } else {
        setError(err.message || "Failed to create crate");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, investmentAmount, selectedTheme, selectedContractTheme, numCoins, allocationType, coinPercentages, connection, signTransaction, setDisplayedTokens, setRerollCount, rerollCount, displayedTokens]);

  const rerollCoins = useCallback(async (slotIndices: number[]) => {
    if (!publicKey || !currentCrate) {
      setError("No crate available");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await apiService.rerollCoins({
        crateId: currentCrate.crateId,
        slotIndices,
        userPublicKey: publicKey.toString(),
      });

      if (!connection || !signTransaction || !publicKey) {
        throw new Error("Wallet not connected");
      }
      const signature = await buildAndSendTransaction(
        connection,
        { publicKey, signTransaction },
        response.transactionInstruction
      );
      setTransactionSignature(signature);

      // Fetch updated crate data
      const crateDetails = await apiService.getCrateDetails(currentCrate.cratePDA);
      if (crateDetails.success) {
        setCurrentCrate({
          ...currentCrate,
          coins: crateDetails.crate.coins,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to reroll coins");
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, currentCrate, connection, signTransaction]);

  const confirmCrate = useCallback(async () => {
    if (!publicKey || !currentCrate) {
      setError("No crate available");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await apiService.confirmCrate(
        currentCrate.crateId,
        publicKey.toString()
      );

      if (!connection || !signTransaction || !publicKey) {
        throw new Error("Wallet not connected");
      }
      const signature = await buildAndSendTransaction(
        connection,
        { publicKey, signTransaction },
        response.transactionInstruction
      );
      setTransactionSignature(signature);

      setCurrentStep(GameFlowStep.PORTFOLIO);
    } catch (err: any) {
      setError(err.message || "Failed to confirm crate");
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, currentCrate, connection, signTransaction]);

  const sellCrate = useCallback(async (expectedReturn: number, crateId?: number) => {
    if (!publicKey) {
      setError("Wallet not connected");
      return;
    }

    // Use provided crateId or currentCrate
    const targetCrateId = crateId || currentCrate?.crateId;
    if (!targetCrateId) {
      setError("No crate available");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await apiService.sellCrate({
        crateId: targetCrateId,
        expectedReturn,
        userPublicKey: publicKey.toString(),
      });

      if (!connection || !signTransaction || !publicKey) {
        throw new Error("Wallet not connected");
      }
      const signature = await buildAndSendTransaction(
        connection,
        { publicKey, signTransaction },
        response.transactionInstruction
      );
      setTransactionSignature(signature);

      // Return sell data for success screen
      return {
        success: true,
        signature,
        userReturn: response.userReturn,
        exitFee: response.exitFee,
        roi: response.roi,
        expectedReturn,
      };
    } catch (err: any) {
      setError(err.message || "Failed to sell crate");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, currentCrate, connection, signTransaction]);

  const resetFlow = useCallback(() => {
    setCurrentStep(GameFlowStep.CHOOSE_AMOUNT);
    setInvestmentAmount(0.5);
    setSelectedTheme(null);
    setSelectedContractTheme(null);
    setNumCoins(4);
    setAllocationType("equal");
    setCoinPercentages(null);
    setCurrentCrate(null);
    setTransactionSignature(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <GameFlowContext.Provider
      value={{
        currentStep,
        setCurrentStep,
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
        setCurrentCrate,
        isRolling,
        setIsRolling,
        isProcessing,
        transactionSignature,
        error,
        displayedTokens,
        setDisplayedTokens,
        rerollCount,
        setRerollCount,
        createCrate,
        rerollCoins,
        confirmCrate,
        sellCrate,
        resetFlow,
        clearError,
      }}
    >
      {children}
    </GameFlowContext.Provider>
  );
};

export const useGameFlow = (): GameFlowContextValue => {
  const ctx = useContext(GameFlowContext);
  if (!ctx) throw new Error("useGameFlow must be used within GameFlowProvider");
  return ctx;
};

