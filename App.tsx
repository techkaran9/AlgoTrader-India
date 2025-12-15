import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import SignupForm from './components/Auth/SignupForm';
import BrokerSetup from './components/Trading/BrokerSetup';
import LiveMarketData from './components/Trading/LiveMarketData';
import LivePositions from './components/Trading/LivePositions';
import RiskSettings from './components/Trading/RiskSettings';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {isLogin ? (
        <LoginForm onToggleMode={() => setIsLogin(false)} />
      ) : (
        <SignupForm onToggleMode={() => setIsLogin(true)} />
      )}
    </div>
  );
};

const TradingDashboard: React.FC = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">AlgoTrader India</h1>
              <p className="text-sm text-gray-400">Automated Trading System</p>
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LiveMarketData />
            <LivePositions />
          </div>

          <div className="space-y-6">
            <BrokerSetup />
            <RiskSettings />
          </div>
        </div>

        <div className="mt-8 bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
          <h3 className="text-blue-300 font-semibold mb-2">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Market Status</div>
              <div className="text-white font-medium">Live Trading</div>
            </div>
            <div>
              <div className="text-gray-400">Auto Trading</div>
              <div className="text-white font-medium">Enabled</div>
            </div>
            <div>
              <div className="text-gray-400">Broker Connection</div>
              <div className="text-green-400 font-medium">Connected</div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-red-900/20 border border-red-700 p-4 rounded-lg">
          <h3 className="text-red-300 font-semibold mb-2">Important Notice</h3>
          <p className="text-red-200 text-sm">
            This is a live trading system connected to your broker account. All trades are real
            and will affect your actual capital. Please ensure you understand the risks involved
            and have configured appropriate risk management settings.
          </p>
        </div>
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return user ? <TradingDashboard /> : <AuthScreen />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
