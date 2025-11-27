import React from "react";
import { Button } from "./ui/button";

interface WalletErrorModalProps {
  error: string | null;
  onClose: () => void;
}

export const WalletErrorModal: React.FC<WalletErrorModalProps> = ({
  error,
  onClose,
}) => {
  if (!error) return null;

  // Prevent modal content clicks from triggering backdrop
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      
      {/* Modal Content - matching other modals' style */}
      <div 
        className="relative w-[600px] flex flex-col items-center justify-center overflow-hidden bg-[#0D0D0D] p-6 sm:p-8 rounded-3xl border-t border-t-[#C4C4C4] border-b border-b-[#5E5E5E] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[1px] before:bg-gradient-to-b before:from-[#C4C4C4] before:to-[#5E5E5E] before:rounded-tl-3xl before:rounded-bl-3xl after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[1px] after:bg-gradient-to-b after:from-[#C4C4C4] after:to-[#5E5E5E] after:rounded-tr-3xl after:rounded-br-3xl"
        onClick={handleModalContentClick}
      >
        <div className="flex flex-col items-center gap-6 sm:gap-8 w-full">
          {/* Message */}
          <p className="[font-family:'Inter',Helvetica] font-normal text-white text-base sm:text-lg tracking-[0] leading-[normal] text-center">
            <span className="text-[#BBFE03]">Wallet Not Connected</span>
            <br />
            <span className="text-white mt-2 block">Please connect your wallet to continue.</span>
          </p>
          
          {/* Close button */}
          <div className="flex justify-center mt-4">
            <Button
              onClick={onClose}
              className="bg-[#BBFE03] hover:bg-[#BBFE03]/90 text-black px-8 py-2 rounded-md font-semibold"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

