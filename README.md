# AlgoTrader India: Automated Live Trading System

AlgoTrader India is a fully automated trading platform for Indian options markets. It integrates directly with the Grow broker API to execute live trades on Nifty and Bank Nifty options based on your configured strategies and risk parameters.

---

## Features

### 1. Live Trading System
- **Real Broker Integration**: Direct connection to Grow broker for live order execution
- **Automated Execution**: Set up strategies that execute automatically based on market conditions
- **Real-time Market Data**: Live price feeds for NIFTY 50 and BANK NIFTY indices
- **Position Tracking**: Monitor all open positions with real-time P&L updates

### 2. Comprehensive Risk Management
- **Daily Loss Limits**: Automatic trading suspension when daily loss threshold is reached
- **Position Size Controls**: Set maximum capital per position
- **Position Count Limits**: Control the number of concurrent open positions
- **Auto-trade Toggle**: Enable/disable automated trading with one click

### 3. Secure Authentication
- **Email/Password Authentication**: Secure user account management via Supabase
- **Encrypted API Credentials**: Broker API keys stored securely in database
- **Session Management**: Automatic token refresh and session handling

### 4. Database-Backed Operations
- **Position History**: Complete record of all trades and positions
- **System Logs**: Detailed logging of all trading activities and errors
- **Strategy Storage**: Save and manage multiple trading strategies
- **Settings Persistence**: User preferences stored securely

---

## Technology Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Broker API**: Grow API integration
- **Charts**: Recharts for data visualization

---

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Grow broker account with API access

### Installation

1. Install dependencies:
```bash
npm install
```

2. The Supabase database is pre-configured with all necessary tables for trading operations.

3. Run the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

---

## Setup Guide

### Step 1: Create Account
1. Open the application
2. Click "Sign up"
3. Enter your email and password
4. Click "Create Account"

### Step 2: Configure Grow Broker
1. Log in to your Grow broker account
2. Navigate to Settings → API Management
3. Generate API credentials (API Key and API Secret)
4. In AlgoTrader, go to "Grow Broker Configuration"
5. Enter your API Key and API Secret
6. Click "Save Credentials"

### Step 3: Configure Risk Settings
1. Navigate to "Risk Management"
2. Set your risk parameters:
   - **Max Daily Loss**: Maximum loss allowed per day (₹)
   - **Max Position Size**: Maximum capital per position (₹)
   - **Max Open Positions**: Maximum number of concurrent positions
3. Toggle "Auto Trading" to enable automated execution
4. Click "Save Settings"

### Step 4: Monitor Your Trading
- View live market data for NIFTY and BANK NIFTY
- Monitor open positions in real-time
- Track P&L for each position
- Exit positions manually when needed

---

## Safety Features

### Automated Risk Controls
- **Circuit Breakers**: Automatic trading halt on daily loss limit
- **Position Limits**: Prevents over-exposure to market
- **Real-time Monitoring**: Continuous position P&L tracking
- **Manual Override**: Ability to exit any position instantly

### Security
- **Encrypted Credentials**: API keys encrypted at rest
- **Row Level Security**: Database access restricted to user's own data
- **Session Management**: Automatic token expiry and refresh
- **Audit Logs**: Complete record of all trading activities

---

## Important Disclaimers

### Risk Warning
- This system executes **REAL TRADES** with **REAL MONEY**
- Options trading involves substantial risk of loss
- Past performance does not guarantee future results
- You can lose more than your initial investment
- Only trade with money you can afford to lose

### Regulatory Compliance
- Ensure you comply with all local trading regulations
- Understand tax implications of your trading activity
- Maintain proper records for regulatory reporting

### System Reliability
- Monitor your positions regularly
- Have backup plans for system downtime
- Understand that technical issues can occur
- Never rely solely on automated systems

---

**Remember**: Trading involves risk. Never invest more than you can afford to lose. This system is provided as-is without any guarantees of profitability or reliability.
