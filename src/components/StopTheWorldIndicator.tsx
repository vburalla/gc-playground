import React from 'react';

interface StopTheWorldIndicatorProps {
  phase: string;
  isVisible: boolean;
}

export const StopTheWorldIndicator: React.FC<StopTheWorldIndicatorProps> = ({ phase, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-1/2 right-8 transform -translate-y-1/2 z-50 animate-fade-in">
      <div className="bg-destructive/95 backdrop-blur-sm rounded-lg p-6 border-2 border-destructive shadow-2xl animate-pulse max-w-xs">
        <div className="flex flex-col items-center text-center">
          <img 
            src="/lovable-uploads/6cecc884-41f4-42ac-8c38-a755a5b8c694.png" 
            alt="Stop the World"
            className="w-20 h-20 mb-3"
          />
          <div className="text-destructive-foreground font-bold text-lg mb-2">
            STOP THE WORLD
          </div>
          <div className="text-destructive-foreground/80 text-sm mb-2">
            Aplicación pausada durante GC
          </div>
          <div className="text-xs bg-destructive-foreground/10 px-3 py-1 rounded text-destructive-foreground">
            Fase: <span className="font-semibold">{phase}</span>
          </div>
        </div>
      </div>
    </div>
  );
};