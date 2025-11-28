import React from 'react';

interface LoadingProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ fullScreen = false, size = 'md', message }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const borderWidths = {
    sm: '2px',
    md: '3px',
    lg: '4px'
  };

  const spinner = (
    <div className={`${sizeClasses[size]} relative`}>
      {/* Outer rotating ring */}
      <div 
        className="absolute inset-0 border-transparent rounded-full animate-spin" 
        style={{ 
          borderWidth: borderWidths[size],
          borderTopColor: '#BBFE03',
          borderRightColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: 'transparent',
          animationDuration: '1s'
        }}
      ></div>
      {/* Inner counter-rotating ring */}
      <div 
        className="absolute inset-0 border-transparent rounded-full" 
        style={{ 
          borderWidth: borderWidths[size],
          borderTopColor: 'transparent',
          borderRightColor: '#BBFE03',
          borderBottomColor: 'transparent',
          borderLeftColor: 'transparent',
          animation: 'spin 0.8s linear infinite reverse'
        }}
      ></div>
      {/* Pulsing center dot */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
      >
        <div 
          className="rounded-full bg-[#BBFE03] animate-pulse"
          style={{
            width: size === 'sm' ? '4px' : size === 'md' ? '6px' : '8px',
            height: size === 'sm' ? '4px' : size === 'md' ? '6px' : '8px',
            animationDuration: '1.5s'
          }}
        ></div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[#060606] flex items-center justify-center z-50 animate-fade-in">
        <div className="flex flex-col items-center gap-6">
          {spinner}
          <div className="flex flex-col items-center gap-2">
            <div className="text-[#BBFE03] text-base font-medium animate-pulse">
              {message || 'Loading...'}
            </div>
            {/* Animated dots */}
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-[#BBFE03] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-1 h-1 bg-[#BBFE03] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-1 bg-[#BBFE03] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-2">
        {spinner}
        {message && (
          <div className="text-[#BBFE03] text-xs font-medium animate-pulse">
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

