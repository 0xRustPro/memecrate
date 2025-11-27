import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";

interface SuccessRedeemProps {
  initialInvestment?: string;
  finalValue?: string;
  totalReturn?: string;
  totalReturnPercent?: string;
  exitFee?: string;
  finalPayout?: string;
  categoryName?: string;
  categoryImage?: string;
  onBackToHome: () => void;
  onViewTransaction: () => void;
}

export const SuccessRedeem = ({
  initialInvestment = "0.110 SOL",
  finalValue = "0.139 SOL",
  totalReturn = "+0.029 SOL",
  totalReturnPercent = "+26 %",
  exitFee = "-0.00139 SOL",
  finalPayout = "0.138 SOL",
  categoryName = "Peltifi",
  categoryImage = "/frame-3.png",
  onBackToHome,
  onViewTransaction,
}: SuccessRedeemProps): JSX.Element => {
  const navigate = useNavigate();

  const handleBackdropClick = () => {
    onBackToHome(); // Close the modal
    // Navigate to crate page (home/first page)
    navigate("/crate", { replace: true });
  };

  // Prevent modal content clicks from triggering backdrop
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={handleBackdropClick}
      />
      
      {/* Modal Content */}
      <div 
        className="relative w-[70%] flex flex-col items-center justify-center overflow-hidden bg-[#0D0D0D] p-6 sm:p-8 rounded-3xl border-t border-t-[#C4C4C4] border-b border-b-[#5E5E5E] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[1px] before:bg-gradient-to-b before:from-[#C4C4C4] before:to-[#5E5E5E] before:rounded-tl-3xl before:rounded-bl-3xl after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[1px] after:bg-gradient-to-b after:from-[#C4C4C4] after:to-[#5E5E5E] after:rounded-tr-3xl after:rounded-br-3xl"
        onClick={handleModalContentClick}
      >
        <main className="flex flex-col items-center gap-6 sm:gap-8 w-full">
          {/* Top Message */}
          <p className="[font-family:'Inter',Helvetica] font-normal text-white text-base sm:text-lg tracking-[0] leading-[normal] text-center">
            <span className="text-[#BBFE03]">Your crate has been redeemed.</span> Final payout has been transferred to your wallet.
          </p>

          {/* Content Block */}
          <div className="flex flex-col items-center gap-4 sm:gap-6 px-6 sm:px-12 py-4 bg-[#181818] border border-solid border-[#2a2a2a] w-[100%]">
            {/* Category Label */}
            <div className="px-3 p">
              <span className="[font-family:'Inter',Helvetica] font-medium text-[#BBFE03] border border-solid border-[#BBFE03] px-5 py-1 rounded-3xl text-xs sm:text-sm tracking-[0] leading-[normal]">
                {categoryName}
              </span>
            </div>

            {/* Category Image */}
            <div className="w-full aspect-square max-w-[250px] h-[200px] flex items-center justify-center overflow-hidden">
              <img 
                src={categoryImage} 
                alt={categoryName}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Financial Details */}
            <div className="flex flex-col gap-0 w-[300px]">
              <div className="flex justify-between items-center">
                <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                  Initial Investment:
                </span>
                <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                  {initialInvestment}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                  Final Value:
                </span>
                <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                  {finalValue}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                  Total Return:
                </span>
                <span className={`[font-family:'Inter',Helvetica] font-semibold text-sm sm:text-base tracking-[0] leading-[normal] ${
                  parseFloat(totalReturnPercent.replace(/[+%\s]/g, '')) > 0 ? 'text-[#BBFE03]' : 'text-[#FE4A03]'
                }`}>
                  <span className="font-bold">{totalReturnPercent}</span> ({totalReturn})
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                  Exit Fee (1%):
                </span>
                <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                  {exitFee}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                  Final Payout:
                </span>
                <span className="[font-family:'Inter',Helvetica] font-normal text-white text-sm sm:text-base tracking-[0] leading-[normal]">
                  {finalPayout}
                </span>
              </div>
            </div>           
          </div>
        </main>
      </div>
    </div>
  );
};
