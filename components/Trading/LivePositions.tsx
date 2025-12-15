import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { growService } from '../../services/growService';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';

interface Position {
  id: string;
  symbol: string;
  action: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  status: string;
}

const LivePositions: React.FC = () => {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [exiting, setExiting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPositions();
      const interval = setInterval(fetchPositions, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchPositions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'OPEN')
        .order('opened_at', { ascending: false });

      if (error) throw error;

      setPositions(data || []);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExit = async (positionId: string) => {
    if (!user) return;

    setExiting(positionId);
    try {
      await growService.exitPosition(user.id, positionId);
      await fetchPositions();
    } catch (error: any) {
      alert(`Failed to exit position: ${error.message}`);
    } finally {
      setExiting(null);
    }
  };

  const getTotalPnL = () => {
    return positions.reduce((sum, pos) => sum + pos.pnl, 0);
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-400' : 'text-red-400';
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center p-8">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Open Positions</h2>
        <div className="text-right">
          <div className="text-xs text-gray-400">Total P&L</div>
          <div className={`text-xl font-bold ${getPnLColor(getTotalPnL())}`}>
            ₹{getTotalPnL().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No open positions
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((position) => (
            <div
              key={position.id}
              className="bg-gray-900/50 p-4 rounded-lg border border-gray-800"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-mono text-white font-medium">
                    {position.symbol}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {position.action} × {position.quantity}
                  </div>
                </div>
                <button
                  onClick={() => handleExit(position.id)}
                  disabled={exiting === position.id}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition duration-200 disabled:opacity-50"
                >
                  {exiting === position.id ? 'Exiting...' : 'Exit'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-gray-400 text-xs">Entry</div>
                  <div className="text-white font-medium">
                    ₹{position.entry_price.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">Current</div>
                  <div className="text-white font-medium">
                    ₹{position.current_price.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">P&L</div>
                  <div className={`font-bold ${getPnLColor(position.pnl)}`}>
                    ₹{position.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default LivePositions;
