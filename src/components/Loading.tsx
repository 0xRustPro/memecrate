import React from 'react';

interface LoadingProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Loading: React.FC<LoadingProps> = ({ fullScreen = false, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-3',
    lg: 'w-16 h-16 border-4'
  };

  const spinner = (
    <div className={`${sizeClasses[size]} relative`}>
      {/* Animated spinner - top */}
      <div 
        className="absolute inset-0 border-transparent rounded-full animate-spin" 
        style={{ 
          borderWidth: size === 'sm' ? '2px' : size === 'md' ? '3px' : '4px',
          borderTopColor: '#BBFE03',
          animationDuration: '1s'
        }}
      ></div>
      {/* Animated spinner - right (counter-rotating) */}
      <div 
        className="absolute inset-0 border-transparent rounded-full" 
        style={{ 
          borderWidth: size === 'sm' ? '2px' : size === 'md' ? '3px' : '4px',
          borderRightColor: '#BBFE03',
          animation: 'spin 0.8s linear infinite reverse'
        }}
      ></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[#060606] flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          {spinner}
          <div className="text-[#BBFE03] text-sm font-medium animate-pulse">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {spinner}
    </div>
  );
};

