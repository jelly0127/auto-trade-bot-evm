'use client';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'trade_bot_history';
const MAX_HISTORY_SIZE = 200; // 最多保存200条记录

// 交易记录类型定义
export interface TradeRecord {
  id: string;
  type: string;
  amount: string;
  price: string;
  timestamp: string;
  wallet: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  chainId?: number;
  txHash?: string;
  status?: 'pending' | 'success' | 'failed';
}

export interface UseTradeHistoryReturn {
  tradeHistory: TradeRecord[];
  addTrade: (trade: Omit<TradeRecord, 'id'>) => void;
  removeTrade: (id: string) => void;
  clearHistory: () => void;
  getHistoryByToken: (tokenAddress: string) => TradeRecord[];
  getHistoryByWallet: (walletAddress: string) => TradeRecord[];
  exportHistory: () => string;
  importHistory: (data: string) => boolean;
  historyCount: number;
}

export const useTradeHistory = (): UseTradeHistoryReturn => {
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);

  // 从本地存储加载交易历史
  const loadHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // 验证数据格式并过滤无效记录
          const validHistory = parsed.filter((record: any) => 
            record && 
            typeof record.id === 'string' &&
            typeof record.type === 'string' &&
            typeof record.timestamp === 'string'
          ).slice(0, MAX_HISTORY_SIZE); // 限制数量

          setTradeHistory(validHistory);
          console.log(`📊 加载了 ${validHistory.length} 条交易历史记录`);
        }
      }
    } catch (error) {
      console.error('加载交易历史失败:', error);
      // 如果存储损坏，清空存储
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // 保存交易历史到本地存储
  const saveHistory = useCallback((history: TradeRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('保存交易历史失败:', error);
    }
  }, []);

  // 添加交易记录
  const addTrade = useCallback((trade: Omit<TradeRecord, 'id'>) => {
    const newTrade: TradeRecord = {
      ...trade,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    setTradeHistory(prev => {
      const newHistory = [newTrade, ...prev].slice(0, MAX_HISTORY_SIZE);
      saveHistory(newHistory);
      return newHistory;
    });
  }, [saveHistory]);

  // 移除交易记录
  const removeTrade = useCallback((id: string) => {
    setTradeHistory(prev => {
      const newHistory = prev.filter(trade => trade.id !== id);
      saveHistory(newHistory);
      return newHistory;
    });
  }, [saveHistory]);

  // 清空交易历史
  const clearHistory = useCallback(() => {
    setTradeHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // 按代币地址筛选交易历史
  const getHistoryByToken = useCallback((tokenAddress: string) => {
    return tradeHistory.filter(trade => 
      trade.tokenAddress?.toLowerCase() === tokenAddress.toLowerCase()
    );
  }, [tradeHistory]);

  // 按钱包地址筛选交易历史
  const getHistoryByWallet = useCallback((walletAddress: string) => {
    return tradeHistory.filter(trade => 
      trade.wallet.toLowerCase() === walletAddress.toLowerCase()
    );
  }, [tradeHistory]);

  // 导出交易历史
  const exportHistory = useCallback(() => {
    return JSON.stringify(tradeHistory, null, 2);
  }, [tradeHistory]);

  // 导入交易历史
  const importHistory = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // 验证并合并数据
        const validHistory = parsed.filter((record: any) => 
          record && 
          typeof record.id === 'string' &&
          typeof record.type === 'string' &&
          typeof record.timestamp === 'string'
        );

        // 合并现有历史，去重
        const mergedHistory = [...tradeHistory];
        const existingIds = new Set(tradeHistory.map(t => t.id));

        validHistory.forEach((trade: TradeRecord) => {
          if (!existingIds.has(trade.id)) {
            mergedHistory.push(trade);
          }
        });

        // 按时间排序并限制数量
        const sortedHistory = mergedHistory
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, MAX_HISTORY_SIZE);

        setTradeHistory(sortedHistory);
        saveHistory(sortedHistory);
        return true;
      }
      return false;
    } catch (error) {
      console.error('导入交易历史失败:', error);
      return false;
    }
  }, [tradeHistory, saveHistory]);

  // 组件挂载时加载历史
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    tradeHistory,
    addTrade,
    removeTrade,
    clearHistory,
    getHistoryByToken,
    getHistoryByWallet,
    exportHistory,
    importHistory,
    historyCount: tradeHistory.length,
  };
}; 