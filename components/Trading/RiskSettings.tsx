import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';

const RiskSettings: React.FC = () => {
  const { user } = useAuth();
  const [maxDailyLoss, setMaxDailyLoss] = useState(10000);
  const [maxPositionSize, setMaxPositionSize] = useState(50000);
  const [maxOpenPositions, setMaxOpenPositions] = useState(5);
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMaxDailyLoss(data.max_daily_loss);
        setMaxPositionSize(data.max_position_size);
        setMaxOpenPositions(data.max_open_positions);
        setAutoTradeEnabled(data.auto_trade_enabled);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          max_daily_loss: maxDailyLoss,
          max_position_size: maxPositionSize,
          max_open_positions: maxOpenPositions,
          auto_trade_enabled: autoTradeEnabled,
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
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
      <h2 className="text-xl font-bold text-white mb-4">Risk Management</h2>

      {success && (
        <div className="bg-green-900/50 text-green-200 p-3 rounded-lg mb-4 text-sm">
          Settings saved successfully!
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Max Daily Loss (₹)
          </label>
          <input
            type="number"
            value={maxDailyLoss}
            onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Trading will stop if daily loss exceeds this amount
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Max Position Size (₹)
          </label>
          <input
            type="number"
            value={maxPositionSize}
            onChange={(e) => setMaxPositionSize(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum capital per position
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Max Open Positions
          </label>
          <input
            type="number"
            value={maxOpenPositions}
            onChange={(e) => setMaxOpenPositions(Number(e.target.value))}
            min="1"
            max="20"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum number of concurrent positions
          </p>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
          <div>
            <div className="text-white font-medium">Auto Trading</div>
            <p className="text-xs text-gray-500 mt-1">
              Enable automated strategy execution
            </p>
          </div>
          <button
            onClick={() => setAutoTradeEnabled(!autoTradeEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoTradeEnabled ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoTradeEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {saving ? <Spinner /> : 'Save Settings'}
        </button>
      </div>
    </Card>
  );
};

export default RiskSettings;
