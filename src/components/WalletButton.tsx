import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { cn } from '../lib/utils';

// Use the default wallet adapter button which handles all wallet connection logic
interface WalletButtonProps {
  className?: string;
  width?: string; // e.g., "w-32", "w-full", "w-auto", "!min-w-[150px]"
}

export const WalletButton = ({ className, width = "!w-[40px]" }: WalletButtonProps) => {
  return (
    <WalletMultiButton 
      className={cn(
        "!h-auto !px-2 !py-2 !rounded-lg",
        width,
        className
      )}
    />
  );
};

