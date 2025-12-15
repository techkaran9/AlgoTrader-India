import { supabase } from '../lib/supabase';
import { growService } from './growService';

interface StrategyConfig {
  name: string;
  type: string;
  instrument: 'NIFTY' | 'BANKNIFTY';
  targetProfit: number;
  maxLoss: number;
  entryTime?: string;
  exitTime?: string;
}

interface StrategyLeg {
  symbol: string;
  instrumentType: 'CE' | 'PE';
  strikePrice: number;
  expiryDate: string;
  action: 'BUY' | 'SELL';
  quantity: number;
}

class StrategyService {
  async createStrategy(userId: string, config: StrategyConfig): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('trading_strategies')
        .insert({
          user_id: userId,
          name: config.name,
          type: config.type,
          instrument: config.instrument,
          is_active: false,
          config: {
            entryTime: config.entryTime || '09:30',
            exitTime: config.exitTime || '15:15',
          },
          risk_params: {
            targetProfit: config.targetProfit,
            maxLoss: config.maxLoss,
          },
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('system_logs').insert({
        user_id: userId,
        log_type: 'INFO',
        message: `Strategy created: ${config.name}`,
        metadata: { strategyId: data.id },
      });

      return data.id;
    } catch (error: any) {
      console.error('Failed to create strategy:', error);
      throw error;
    }
  }

  async activateStrategy(userId: string, strategyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('trading_strategies')
        .update({ is_active: true })
        .eq('id', strategyId)
        .eq('user_id', userId);

      if (error) throw error;

      await supabase.from('system_logs').insert({
        user_id: userId,
        log_type: 'INFO',
        message: `Strategy activated: ${strategyId}`,
      });
    } catch (error) {
      console.error('Failed to activate strategy:', error);
      throw error;
    }
  }

  async deactivateStrategy(userId: string, strategyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('trading_strategies')
        .update({ is_active: false })
        .eq('id', strategyId)
        .eq('user_id', userId);

      if (error) throw error;

      await supabase.from('system_logs').insert({
        user_id: userId,
        log_type: 'INFO',
        message: `Strategy deactivated: ${strategyId}`,
      });
    } catch (error) {
      console.error('Failed to deactivate strategy:', error);
      throw error;
    }
  }

  async executeStrategy(userId: string, strategyId: string, legs: StrategyLeg[]): Promise<void> {
    try {
      // Check risk parameters
      const canTrade = await this.checkRiskLimits(userId);
      if (!canTrade) {
        throw new Error('Risk limits exceeded. Cannot execute strategy.');
      }

      // Execute each leg
      for (const leg of legs) {
        const orderResponse = await growService.placeOrder(userId, {
          symbol: leg.symbol,
          action: leg.action,
          quantity: leg.quantity,
          orderType: 'MARKET',
          product: 'INTRADAY',
        });

        if (orderResponse.status === 'EXECUTED') {
          // Create position record
          await supabase.from('positions').insert({
            user_id: userId,
            strategy_id: strategyId,
            broker_order_id: orderResponse.orderId,
            symbol: leg.symbol,
            instrument_type: leg.instrumentType,
            strike_price: leg.strikePrice,
            expiry_date: leg.expiryDate,
            action: leg.action,
            quantity: leg.quantity,
            entry_price: 0, // Will be updated from broker response
            status: 'OPEN',
          });
        }
      }

      await supabase.from('system_logs').insert({
        user_id: userId,
        log_type: 'TRADE',
        message: `Strategy executed: ${strategyId}`,
        metadata: { legs },
      });
    } catch (error: any) {
      await supabase.from('system_logs').insert({
        user_id: userId,
        log_type: 'ERROR',
        message: `Strategy execution failed: ${error.message}`,
        metadata: { strategyId, error: error.message },
      });
      throw error;
    }
  }

  private async checkRiskLimits(userId: string): Promise<boolean> {
    try {
      // Get user settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!settings || !settings.auto_trade_enabled) {
        return false;
      }

      // Check max open positions
      const { data: openPositions } = await supabase
        .from('positions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'OPEN');

      if (openPositions && openPositions.length >= settings.max_open_positions) {
        return false;
      }

      // Check daily loss
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayTrades } = await supabase
        .from('positions')
        .select('pnl')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());

      const dailyPnl = todayTrades?.reduce((sum, pos) => sum + (pos.pnl || 0), 0) || 0;

      if (dailyPnl < -settings.max_daily_loss) {
        await supabase.from('system_logs').insert({
          user_id: userId,
          log_type: 'WARNING',
          message: `Daily loss limit reached: ₹${Math.abs(dailyPnl)}`,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking risk limits:', error);
      return false;
    }
  }

  async monitorPositions(userId: string): Promise<void> {
    try {
      const { data: positions } = await supabase
        .from('positions')
        .select('*, trading_strategies(*)')
        .eq('user_id', userId)
        .eq('status', 'OPEN');

      if (!positions || positions.length === 0) {
        return;
      }

      for (const position of positions) {
        // Get current market price
        const marketData = await growService.getMarketData(position.symbol);

        // Calculate P&L
        const pnl = this.calculatePnL(position, marketData.ltp);

        // Update position
        await supabase
          .from('positions')
          .update({
            current_price: marketData.ltp,
            pnl,
          })
          .eq('id', position.id);

        // Check if stop loss or target hit
        if (position.trading_strategies) {
          const riskParams = position.trading_strategies.risk_params;

          if (riskParams.maxLoss && pnl <= -riskParams.maxLoss) {
            await growService.exitPosition(userId, position.id);
            await supabase.from('system_logs').insert({
              user_id: userId,
              log_type: 'WARNING',
              message: `Stop loss hit for position ${position.symbol}`,
            });
          } else if (riskParams.targetProfit && pnl >= riskParams.targetProfit) {
            await growService.exitPosition(userId, position.id);
            await supabase.from('system_logs').insert({
              user_id: userId,
              log_type: 'INFO',
              message: `Target profit reached for position ${position.symbol}`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error monitoring positions:', error);
    }
  }

  private calculatePnL(position: any, currentPrice: number): number {
    const lotSize = position.symbol.includes('NIFTY') && !position.symbol.includes('BANK') ? 50 : 15;
    const priceChange = currentPrice - position.entry_price;
    const multiplier = position.action === 'BUY' ? 1 : -1;
    return priceChange * multiplier * lotSize * position.quantity;
  }
}

export const strategyService = new StrategyService();
