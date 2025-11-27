import React, { useEffect, useState } from "react";

interface RollingAnimationProps {
  numCoins: number;
  onComplete: () => void;
}

export const RollingAnimation: React.FC<RollingAnimationProps> = ({ numCoins, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRolling, setIsRolling] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 10);
    }, 100);

    const timer = setTimeout(() => {
      setIsRolling(false);
      clearInterval(interval);
      onComplete();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8 bg-[#060606] min-h-[400px]">
      <h2 className="text-white text-2xl font-bold">Rolling Your Crate...</h2>
      <div className="flex gap-4 flex-wrap justify-center">
        {Array.from({ length: numCoins }).map((_, index) => (
          <div
            key={index}
            className={`w-24 h-24 bg-[#343434] border-2 border-[#c0c0c0] flex items-center justify-center transition-all duration-300 ${
              isRolling ? "animate-pulse" : ""
            }`}
          >
            {!isRolling && (
              <span className="text-white text-2xl">🎰</span>
            )}
            {isRolling && (
              <div className="text-white text-2xl animate-spin">
                {["🎰", "💰", "🎲", "🎯"][currentIndex % 4]}
              </div>
            )}
          </div>
        ))}
      </div>
      {isRolling && (
        <p className="text-[#bbbbbb] text-sm">Selecting your coins...</p>
      )}
    </div>
  );
};

