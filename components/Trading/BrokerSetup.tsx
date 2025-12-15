import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';

const BrokerSetup: React.FC = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkBrokerSetup();
  }, [user]);

  const checkBrokerSetup = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('broker_credentials')
        .select('id')
        .eq('user_id', user.id)
        .eq('broker_name', 'grow')
        .maybeSingle();

      setIsConfigured(!!data);
    } catch (err) {
      console.error('Error checking broker setup:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase
        .from('broker_credentials')
        .upsert({
          user_id: user.id,
          broker_name: 'grow',
          api_key: apiKey,
          api_secret: apiSecret,
          is_active: true,
        });

      if (error) throw error;

      setSuccess(true);
      setIsConfigured(true);
      setApiKey('');
      setApiSecret('');

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
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
      <h2 className="text-xl font-bold text-white mb-4">Grow Broker Configuration</h2>

      {isConfigured && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 p-3 rounded-lg mb-4 text-sm">
          ✓ Broker credentials configured. You can update them below.
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 text-green-200 p-3 rounded-lg mb-4 text-sm">
          Credentials saved successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 text-red-200 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Grow API Key
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
            placeholder="Enter your Grow API Key"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Grow API Secret
          </label>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
            placeholder="Enter your Grow API Secret"
          />
        </div>

        <div className="bg-blue-900/30 border border-blue-700 text-blue-300 p-3 rounded-lg text-sm">
          <p className="font-medium mb-1">How to get your API credentials:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Login to your Grow account</li>
            <li>Go to Settings → API Management</li>
            <li>Generate new API credentials</li>
            <li>Copy and paste them here</li>
          </ol>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? <Spinner /> : isConfigured ? 'Update Credentials' : 'Save Credentials'}
        </button>
      </form>

      <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
        <p className="text-red-300 text-xs">
          <strong>Warning:</strong> These credentials provide access to your trading account.
          Keep them secure and never share them with anyone.
        </p>
      </div>
    </Card>
  );
};

export default BrokerSetup;
