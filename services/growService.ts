import axios, { AxiosInstance } from 'axios';
import { supabase } from '../lib/supabase';

// Grow API Base URL
const GROW_API_BASE = 'https://api.groww.in';

interface GrowCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken?: string;
}

interface MarketQuote {
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  volume: number;
  oi: number;
}

interface OrderRequest {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT';
  price?: number;
  product: 'INTRADAY' | 'DELIVERY';
}

interface OrderResponse {
  orderId: string;
  status: 'PENDING' | 'EXECUTED' | 'REJECTED';
  message?: string;
}

class GrowService {
  private client: AxiosInstance;
  private credentials: GrowCredentials | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: GROW_API_BASE,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async initialize(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('broker_credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('broker_name', 'grow')
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        console.error('Failed to load broker credentials:', error);
        return false;
      }

      this.credentials = {
        apiKey: data.api_key,
        apiSecret: data.api_secret,
        accessToken: data.access_token,
      };

      // Check if token is expired
      if (data.token_expiry && new Date(data.token_expiry) < new Date()) {
        await this.refreshToken(userId);
      }

      return true;
    } catch (error) {
      console.error('Error initializing Grow service:', error);
      return false;
    }
  }

  private async refreshToken(userId: string): Promise<void> {
    if (!this.credentials) {
      throw new Error('Credentials not initialized');
    }

    try {
      // Mock token refresh - Replace with actual Grow API endpoint
      const response = await this.client.post('/auth/token', {
        apiKey: this.credentials.apiKey,
        apiSecret: this.credentials.apiSecret,
      });

      const { access_token, expires_in } = response.data;
      this.credentials.accessToken = access_token;

      const tokenExpiry = new Date();
      tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expires_in);

      await supabase
        .from('broker_credentials')
        .update({
          access_token,
          token_expiry: tokenExpiry.toISOString(),
        })
        .eq('user_id', userId)
        .eq('broker_name', 'grow');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }

  async getMarketData(symbol: string): Promise<MarketQuote> {
    if (!this.credentials?.accessToken) {
      throw new Error('Not authenticated with broker');
    }

    try {
      // Mock market data - Replace with actual Grow API endpoint
      const response = await this.client.get(`/market/quote/${symbol}`, {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      });

      const quote = response.data;

      // Cache in database
      await supabase.from('market_data').insert({
        symbol: quote.symbol,
        ltp: quote.ltp,
        bid: quote.bid,
        ask: quote.ask,
        volume: quote.volume,
        oi: quote.oi,
        timestamp: new Date().toISOString(),
      });

      return quote;
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      throw error;
    }
  }

  async getIndexData(index: 'NIFTY' | 'BANKNIFTY'): Promise<MarketQuote> {
    const symbol = index === 'NIFTY' ? 'NIFTY 50' : 'NIFTY BANK';
    return this.getMarketData(symbol);
  }

  async placeOrder(userId: string, orderRequest: OrderRequest): Promise<OrderResponse> {
    if (!this.credentials?.accessToken) {
      throw new Error('Not authenticated with broker');
    }

    try {
      // Log the trade attempt
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .insert({
          user_id: userId,
          order_type: orderRequest.orderType,
          action: orderRequest.action,
          quantity: orderRequest.quantity,
          price: orderRequest.price || 0,
          status: 'PENDING',
        })
        .select()
        .single();

      if (tradeError) {
        throw tradeError;
      }

      // Place order with broker - Replace with actual Grow API endpoint
      const response = await this.client.post(
        '/orders',
        orderRequest,
        {
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
          },
        }
      );

      const orderResponse: OrderResponse = response.data;

      // Update trade record
      await supabase
        .from('trades')
        .update({
          broker_order_id: orderResponse.orderId,
          status: orderResponse.status,
          executed_at: orderResponse.status === 'EXECUTED' ? new Date().toISOString() : null,
          error_message: orderResponse.message,
        })
        .eq('id', tradeData.id);

      // Log the trade
      await supabase.from('system_logs').insert({
        user_id: userId,
        log_type: 'TRADE',
        message: `Order placed: ${orderRequest.action} ${orderRequest.quantity} ${orderRequest.symbol}`,
        metadata: { orderResponse, orderRequest },
      });

      return orderResponse;
    } catch (error: any) {
      console.error('Failed to place order:', error);

      await supabase.from('system_logs').insert({
        user_id: userId,
        log_type: 'ERROR',
        message: `Order failed: ${error.message}`,
        metadata: { error: error.message, orderRequest },
      });

      throw error;
    }
  }

  async getPositions(userId: string): Promise<any[]> {
    if (!this.credentials?.accessToken) {
      throw new Error('Not authenticated with broker');
    }

    try {
      // Fetch positions from broker - Replace with actual Grow API endpoint
      const response = await this.client.get('/positions', {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      throw error;
    }
  }

  async exitPosition(userId: string, positionId: string): Promise<OrderResponse> {
    // Get position details
    const { data: position, error } = await supabase
      .from('positions')
      .select('*')
      .eq('id', positionId)
      .eq('user_id', userId)
      .single();

    if (error || !position) {
      throw new Error('Position not found');
    }

    // Place opposite order
    const exitOrder: OrderRequest = {
      symbol: position.symbol,
      action: position.action === 'BUY' ? 'SELL' : 'BUY',
      quantity: position.quantity,
      orderType: 'MARKET',
      product: 'INTRADAY',
    };

    const orderResponse = await this.placeOrder(userId, exitOrder);

    if (orderResponse.status === 'EXECUTED') {
      // Update position
      await supabase
        .from('positions')
        .update({
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
          exit_price: position.current_price,
        })
        .eq('id', positionId);
    }

    return orderResponse;
  }
}

export const growService = new GrowService();
