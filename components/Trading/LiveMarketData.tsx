import React, { useEffect, useState } from 'react';
import { growService } from '../../services/growService';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import type { MarketData } from '../../types';

const LiveMarketData: React.FC = () => {
  const { user } = useAuth();
  const [marketData, setMarketData] = useState<MarketData[]>([
    { name: 'NIFTY 50', price: 0, change: 0, changePercent: 0 },
    { name: 'BANK NIFTY', price: 0, change: 0, changePercent: 0 },
  ]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const initializeAndFetch = async () => {
      const initialized = await growService.initialize(user.id);
      setIsConnected(initialized);

      if (initialized) {
        fetchMarketData();
      }
    };

    initializeAndFetch();

    const interval = setInterval(() => {
      if (isConnected) {
        fetchMarketData();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, isConnected]);

  const fetchMarketData = async () => {
    try {
      const [niftyData, bankNiftyData] = await Promise.all([
        growService.getIndexData('NIFTY'),
        growService.getIndexData('BANKNIFTY'),
      ]);

      setMarketData([
        {
          name: 'NIFTY 50',
          price: niftyData.ltp,
          change: niftyData.change,
          changePercent: niftyData.changePercent,
        },
        {
          name: 'BANK NIFTY',
          price: bankNiftyData.ltp,
          change: bankNiftyData.change,
          changePercent: bankNiftyData.changePercent,
        },
      ]);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Live Market Data</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {marketData.map((data) => (
          <div key={data.name} className="bg-gray-900/50 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">{data.name}</div>
            <div className="text-2xl font-bold text-white mb-2">
              ₹{data.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-sm font-medium ${getChangeColor(data.change)}`}>
              {data.change >= 0 ? '+' : ''}
              ₹{data.change.toFixed(2)} ({data.changePercent >= 0 ? '+' : ''}
              {data.changePercent.toFixed(2)}%)
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </Card>
  );
};

export default LiveMarketData;
