import { GoogleGenAI, Type } from "@google/genai";
import type { StrategySuggestion, BacktestResult, OptionPick, FoundStrategy } from '../types';
import { STRATEGIES } from '../constants';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const strategyNames = STRATEGIES.map(s => s.name).join(', ');

const systemInstruction = `You are an expert financial analyst specializing in Indian derivatives markets, particularly Nifty and Bank Nifty options. Your goal is to provide data-driven, insightful, and cautious advice for paper trading simulations. Do not provide real financial advice. All outputs must be in JSON format.`;

export const fetchStrategySuggestion = async (instrument: string): Promise<StrategySuggestion> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Analyze the current market sentiment for today for ${instrument}. Based on your analysis, suggest the most potentially profitable options trading strategy from the following list: ${strategyNames}. For the suggested strategy, provide a brief rationale (2-3 sentences), key parameters (like market view, suggested strike prices relative to the current price, and a hypothetical stop-loss), and potential risks.`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategyName: { type: Type.STRING, description: 'The name of the suggested strategy.' },
            rationale: { type: Type.STRING, description: 'The reasoning behind the suggestion.' },
            parameters: {
              type: Type.OBJECT,
              properties: {
                view: { type: Type.STRING, description: 'The market view (e.g., Bullish, Bearish, Neutral).' },
                suggestedStrikes: { type: Type.STRING, description: 'Suggested strike prices, e.g., "ATM Call & OTM Call".' },
                stopLoss: { type: Type.STRING, description: 'A hypothetical stop-loss target, e.g., "50% of max loss".' },
              },
              required: ['view', 'suggestedStrikes', 'stopLoss']
            },
            risks: { type: Type.STRING, description: 'The potential risks of this strategy.' },
          },
          required: ['strategyName', 'rationale', 'parameters', 'risks'],
        },
      },
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as StrategySuggestion;
  } catch (error) {
    console.error("Error fetching strategy suggestion:", error);
    throw new Error("Failed to get a strategy suggestion from the AI. Please try again.");
  }
};

export const runBacktest = async (instrument: string, strategyName: string): Promise<BacktestResult> => {
  try {
    const today = new Date();
    // Use UTC date parts to avoid timezone issues when constructing the date string
    const todayFormatted = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Simulate the performance of the '${strategyName}' strategy for ${instrument} options. Provide two sets of hypothetical data:
1. **Today's Intraday Simulation**: Generate an outcome for today's market conditions (${todayFormatted}) including: an array of individual strategy legs (instrument, action, entryPrice), estimated capital required in INR for one lot, maximum potential loss in INR, final Profit/Loss as a percentage, final Profit/Loss as an absolute amount in INR, a brief commentary on today's performance, and 8 data points representing the P/L amount in INR fluctuation throughout a 6-hour trading day (e.g., 9:30, 10:30, etc.).
2. **7-Day Historical Simulation**: Provide a hypothetical daily P/L amount in INR for this same strategy if it were executed on each of the last 7 market working days prior to today. The days must be sequential working days (Monday-Friday), going backwards from yesterday. For example, if today is Wednesday, the dates should be for Tuesday, Monday, the previous Friday, Thursday, Wednesday, Tuesday, and Monday. For each day, provide the date in 'YYYY-MM-DD' format. The list must be ordered from the most recent trading day (yesterday) to the oldest.`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pnl: { type: Type.NUMBER, description: 'The final estimated Profit/Loss percentage.' },
            pnlAmount: { type: Type.NUMBER, description: 'The final estimated Profit/Loss in INR.' },
            requiredCapital: { type: Type.NUMBER, description: 'The estimated capital required in INR.' },
            maxLoss: { type: Type.NUMBER, description: 'The maximum potential loss in INR.' },
            strategyLegs: {
              type: Type.ARRAY,
              description: "The individual legs of the strategy.",
              items: {
                type: Type.OBJECT,
                properties: {
                  instrument: { type: Type.STRING, description: 'e.g., "NIFTY 23500 CE".' },
                  action: { type: Type.STRING, description: '"Buy" or "Sell".' },
                  entryPrice: { type: Type.NUMBER, description: 'Hypothetical entry price in INR.' },
                },
                required: ['instrument', 'action', 'entryPrice']
              }
            },
            commentary: { type: Type.STRING, description: 'A brief analysis of the performance.' },
            dataPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING, description: 'The time of the data point (e.g., "10:30").' },
                  pnlAmount: { type: Type.NUMBER, description: 'The P/L amount in INR at that time.' },
                },
                required: ['time', 'pnlAmount']
              }
            },
            historicalPnl: {
              type: Type.ARRAY,
              description: "Hypothetical P/L for the past 7 trading days, ordered from most recent to oldest.",
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: 'The date of the trading day in YYYY-MM-DD format.' },
                  pnlAmount: { type: Type.NUMBER, description: 'The P/L amount in INR for that day.' },
                },
                required: ['date', 'pnlAmount']
              }
            },
          },
          required: ['pnl', 'pnlAmount', 'requiredCapital', 'maxLoss', 'strategyLegs', 'commentary', 'dataPoints', 'historicalPnl'],
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as BacktestResult;
  } catch (error) {
    console.error("Error running backtest:", error);
    throw new Error("Failed to run the simulation. Please try again.");
  }
};

export const fetchTopPicks = async (instrument: string): Promise<OptionPick[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Analyze today's market conditions for ${instrument}. Provide a list of the top 5 most promising intraday options trading ideas. For each idea, specify the exact instrument (e.g., NIFTY 23500 CE), the action (Buy or Sell), a hypothetical entry price in INR for one lot, the approximate capital required in INR to enter one lot, the potential profit in INR, the potential loss (max loss) in INR, and a brief rationale for the trade. The suggestions are for paper trading only.`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              instrument: { type: Type.STRING, description: 'The specific option instrument, e.g., "NIFTY 23500 CE".' },
              action: { type: Type.STRING, description: 'The action to take, e.g., "Buy" or "Sell".' },
              entryPrice: { type: Type.NUMBER, description: 'Hypothetical entry price in INR for one lot.' },
              requiredCapital: { type: Type.NUMBER, description: 'Approximate capital in INR for one lot.' },
              potentialProfit: { type: Type.NUMBER, description: 'Potential profit in INR.' },
              potentialLoss: { type: Type.NUMBER, description: 'Potential maximum loss in INR.' },
              rationale: { type: Type.STRING, description: 'A brief reason for the suggestion.' },
            },
            required: ['instrument', 'action', 'entryPrice', 'requiredCapital', 'potentialProfit', 'potentialLoss', 'rationale']
          }
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as OptionPick[];
  } catch (error) {
    console.error("Error fetching top picks:", error);
    throw new Error("Failed to get top picks from the AI. Please try again.");
  }
};

export const findStrategies = async (instrument: string, targetProfit: number, maxLoss: number): Promise<FoundStrategy[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Based on today's intraday market conditions for ${instrument}, find up to 3 options strategies from this list: ${strategyNames}. The strategies should have a reasonable probability of achieving a profit greater than ${targetProfit} INR, while keeping the maximum potential loss below ${maxLoss} INR for a single lot. For each suggested strategy, provide the strategy name, a brief rationale explaining why it fits the criteria, the suggested strike prices, and the estimated profit and loss in INR.`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              strategyName: { type: Type.STRING, description: 'The name of the suggested strategy.' },
              rationale: { type: Type.STRING, description: 'Why this strategy fits the profit/loss criteria.' },
              suggestedStrikes: { type: Type.STRING, description: 'Specific suggested strike prices, e.g., "Buy 23500 CE, Sell 23700 CE".' },
              estimatedProfit: { type: Type.NUMBER, description: 'The estimated potential profit in INR.' },
              estimatedLoss: { type: Type.NUMBER, description: 'The estimated maximum potential loss in INR.' },
            },
            required: ['strategyName', 'rationale', 'suggestedStrikes', 'estimatedProfit', 'estimatedLoss'],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as FoundStrategy[];
  } catch (error) {
    console.error("Error finding strategies:", error);
    throw new Error("Failed to find strategies from the AI. Please try again.");
  }
};