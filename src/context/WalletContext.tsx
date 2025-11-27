import React, { FC, ReactNode, useMemo, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletErrorModal } from '../components/WalletErrorModal';

// Import wallet adapter CSS
// @ts-ignore - CSS import
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextProviderProps {
  children: ReactNode;
}

// Create context for wallet error control
export const WalletErrorContext = React.createContext<{
  showWalletError: (message: string) => void;
}>({
  showWalletError: () => {},
});

export const WalletContextProvider: FC<WalletContextProviderProps> = ({
  children,
}) => {
  const [walletError, setWalletError] = useState<string | null>(null);
  
  const showWalletError = (message: string) => {
    setWalletError(message);
  };
  
  // Use devnet for development, or mainnet-beta for production
  const network = WalletAdapterNetwork.Devnet;
  
  // Get RPC endpoint from environment or use a reliable public endpoint
  const endpoint = useMemo(() => {
    // Check for custom RPC endpoint in environment variable
    if ((import.meta as any).env?.VITE_SOLANA_RPC_URL) {
      const customUrl = (import.meta as any).env.VITE_SOLANA_RPC_URL as string;
      console.log('Using custom Solana RPC URL:', customUrl);
      return customUrl;
    }
    
    // Use the official Solana devnet RPC endpoint
    // This is publicly accessible and works from any location
    const devnetEndpoint = clusterApiUrl(network);
    console.log('Using default Solana RPC endpoint:', devnetEndpoint);
    return devnetEndpoint;
  }, [network]);

  console.log('Solana RPC Endpoint:', endpoint);

  // Initialize wallets - only include Phantom to avoid duplicate MetaMask errors
  const wallets = useMemo(() => {
    return [
      new PhantomWalletAdapter(),
    ];
  }, []);

  const handleError = (error: any) => {
    console.error('Wallet adapter error:', error);
    // Log more details about connection errors
    if (error.message) {
      console.error('Error message:', error.message);
    }
    if (error.name) {
      console.error('Error name:', error.name);
    }
    
    // Only show modal for wallet connection errors, not for user rejections
    const errorMessage = error.message || error.name || '';
    
    // Show modal only for wallet connection issues
    if (errorMessage.includes('wallet') && errorMessage.includes('connect')) {
      setWalletError('Please connect your wallet');
    } else if (errorMessage.includes('Wallet not connected')) {
      setWalletError('Please connect your wallet');
    }
    // Don't show modal for user rejections - user intentionally cancelled
  };

  const handleCloseError = () => {
    setWalletError(null);
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={handleError}
      >
        <WalletModalProvider>
          <WalletErrorContext.Provider value={{ showWalletError }}>
            {children}
          </WalletErrorContext.Provider>
          <WalletErrorModal error={walletError} onClose={handleCloseError} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
