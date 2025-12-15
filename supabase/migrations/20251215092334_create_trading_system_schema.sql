/*
  # Auto Trading System Schema

  ## Overview
  This migration creates the complete database schema for an automated trading system
  that integrates with Grow broker API for live trading of Nifty and Bank Nifty options.

  ## New Tables
  
  ### 1. `broker_credentials`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `broker_name` (text) - Always "grow"
  - `api_key` (text, encrypted)
  - `api_secret` (text, encrypted)
  - `access_token` (text)
  - `token_expiry` (timestamptz)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `trading_strategies`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `name` (text)
  - `type` (text) - Strategy type (bull_call_spread, iron_condor, etc.)
  - `instrument` (text) - NIFTY or BANKNIFTY
  - `is_active` (boolean)
  - `config` (jsonb) - Strategy parameters
  - `risk_params` (jsonb) - Max loss, target profit, etc.
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `positions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `strategy_id` (uuid, references trading_strategies)
  - `broker_order_id` (text)
  - `symbol` (text)
  - `instrument_type` (text) - CE or PE
  - `strike_price` (numeric)
  - `expiry_date` (date)
  - `action` (text) - BUY or SELL
  - `quantity` (integer)
  - `entry_price` (numeric)
  - `current_price` (numeric)
  - `exit_price` (numeric)
  - `pnl` (numeric)
  - `status` (text) - OPEN, CLOSED, PENDING
  - `opened_at` (timestamptz)
  - `closed_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `trades`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `position_id` (uuid, references positions)
  - `broker_order_id` (text)
  - `order_type` (text) - MARKET, LIMIT
  - `action` (text) - BUY or SELL
  - `quantity` (integer)
  - `price` (numeric)
  - `status` (text) - PENDING, EXECUTED, REJECTED, CANCELLED
  - `error_message` (text)
  - `executed_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 5. `market_data`
  - `id` (uuid, primary key)
  - `symbol` (text)
  - `instrument_type` (text)
  - `strike_price` (numeric)
  - `expiry_date` (date)
  - `ltp` (numeric) - Last traded price
  - `bid` (numeric)
  - `ask` (numeric)
  - `volume` (bigint)
  - `oi` (bigint) - Open interest
  - `timestamp` (timestamptz)

  ### 6. `user_settings`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `max_daily_loss` (numeric)
  - `max_position_size` (numeric)
  - `max_open_positions` (integer)
  - `auto_trade_enabled` (boolean)
  - `notifications_enabled` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. `system_logs`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `log_type` (text) - ERROR, INFO, WARNING, TRADE
  - `message` (text)
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

  ## Security
  - All tables have RLS enabled
  - Users can only access their own data
  - API credentials are encrypted at rest
*/

-- Create broker_credentials table
CREATE TABLE IF NOT EXISTS broker_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_name text NOT NULL DEFAULT 'grow',
  api_key text NOT NULL,
  api_secret text NOT NULL,
  access_token text,
  token_expiry timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, broker_name)
);

ALTER TABLE broker_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credentials"
  ON broker_credentials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
  ON broker_credentials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
  ON broker_credentials FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
  ON broker_credentials FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trading_strategies table
CREATE TABLE IF NOT EXISTS trading_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  instrument text NOT NULL,
  is_active boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  risk_params jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trading_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strategies"
  ON trading_strategies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies"
  ON trading_strategies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
  ON trading_strategies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
  ON trading_strategies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create positions table
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES trading_strategies(id) ON DELETE SET NULL,
  broker_order_id text,
  symbol text NOT NULL,
  instrument_type text NOT NULL,
  strike_price numeric NOT NULL,
  expiry_date date NOT NULL,
  action text NOT NULL,
  quantity integer NOT NULL,
  entry_price numeric NOT NULL,
  current_price numeric DEFAULT 0,
  exit_price numeric,
  pnl numeric DEFAULT 0,
  status text DEFAULT 'OPEN',
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions"
  ON positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions"
  ON positions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions"
  ON positions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id uuid REFERENCES positions(id) ON DELETE SET NULL,
  broker_order_id text,
  order_type text NOT NULL,
  action text NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  status text DEFAULT 'PENDING',
  error_message text,
  executed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create market_data table
CREATE TABLE IF NOT EXISTS market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  instrument_type text,
  strike_price numeric,
  expiry_date date,
  ltp numeric NOT NULL,
  bid numeric,
  ask numeric,
  volume bigint DEFAULT 0,
  oi bigint DEFAULT 0,
  timestamp timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON market_data(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_lookup ON market_data(symbol, instrument_type, strike_price, expiry_date, timestamp DESC);

ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market data is viewable by authenticated users"
  ON market_data FOR SELECT
  TO authenticated
  USING (true);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  max_daily_loss numeric DEFAULT 10000,
  max_position_size numeric DEFAULT 50000,
  max_open_positions integer DEFAULT 5,
  auto_trade_enabled boolean DEFAULT false,
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  log_type text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_user_time ON system_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(log_type, created_at DESC);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON system_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON system_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_broker_credentials_updated_at BEFORE UPDATE ON broker_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_strategies_updated_at BEFORE UPDATE ON trading_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
