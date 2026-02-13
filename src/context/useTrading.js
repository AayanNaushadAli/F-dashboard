import { useContext } from 'react';
import { TradingContext } from './TradingContextCore';

export const useTrading = () => {
  const ctx = useContext(TradingContext);
  if (!ctx) {
    throw new Error('useTrading must be used inside TradingProvider');
  }
  return ctx;
};
