'use client';
import React from 'react';
import { type TradeRecord } from '@/hooks/useTradeHistory';

interface TradeHistoryStatsProps {
  tradeHistory: TradeRecord[];
  selectedTokenAddress?: string;
}

interface TradeStats {
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  totalVolume: number;
  averagePrice: number;
  topToken: { symbol: string; count: number } | null;
  topWallet: { address: string; count: number } | null;
}

const TradeHistoryStats: React.FC<TradeHistoryStatsProps> = ({
  tradeHistory,
  selectedTokenAddress
}) => {
  // 计算统计数据
  const calculateStats = (): TradeStats => {
    if (tradeHistory.length === 0) {
      return {
        totalTrades: 0,
        buyTrades: 0,
        sellTrades: 0,
        totalVolume: 0,
        averagePrice: 0,
        topToken: null,
        topWallet: null
      };
    }

    // 过滤交易记录（如果指定了代币）
    const filteredTrades = selectedTokenAddress
      ? tradeHistory.filter(trade => trade.tokenAddress === selectedTokenAddress)
      : tradeHistory;

    const buyTrades = filteredTrades.filter(trade =>
      trade.type.includes('BUY') || trade.type.includes('PUMP_BUY')
    ).length;

    const sellTrades = filteredTrades.filter(trade =>
      trade.type.includes('SELL') || trade.type.includes('DUMP_SELL')
    ).length;

    // 计算总交易量
    const totalVolume = filteredTrades.reduce((sum, trade) => {
      const amount = parseFloat(trade.amount) || 0;
      const price = parseFloat(trade.price) || 0;
      return sum + (amount * price);
    }, 0);

    // 计算平均价格
    const validPrices = filteredTrades
      .map(trade => parseFloat(trade.price))
      .filter(price => !isNaN(price) && price > 0);

    const averagePrice = validPrices.length > 0
      ? validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length
      : 0;

    // 找出最常交易的代币
    const tokenCounts: { [key: string]: { symbol: string; count: number } } = {};
    filteredTrades.forEach(trade => {
      if (trade.tokenSymbol) {
        const key = trade.tokenSymbol;
        if (tokenCounts[key]) {
          tokenCounts[key].count++;
        } else {
          tokenCounts[key] = { symbol: trade.tokenSymbol, count: 1 };
        }
      }
    });

    const topToken = Object.values(tokenCounts).reduce((top, current) =>
      (!top || current.count > top.count) ? current : top
      , null as { symbol: string; count: number } | null);

    // 找出最活跃的钱包
    const walletCounts: { [key: string]: { address: string; count: number } } = {};
    filteredTrades.forEach(trade => {
      const key = trade.wallet;
      if (walletCounts[key]) {
        walletCounts[key].count++;
      } else {
        walletCounts[key] = { address: trade.wallet, count: 1 };
      }
    });

    const topWallet = Object.values(walletCounts).reduce((top, current) =>
      (!top || current.count > top.count) ? current : top
      , null as { address: string; count: number } | null);

    return {
      totalTrades: filteredTrades.length,
      buyTrades,
      sellTrades,
      totalVolume,
      averagePrice,
      topToken,
      topWallet
    };
  };

  const stats = calculateStats();

  if (tradeHistory.length === 0) {
    return (
      <div className="rounded-lg bg-[#FFFFFF1A] p-4 text-center text-gray-400">
        <p className="text-sm">暂无交易数据统计</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[#FFFFFF1A] p-4">
      <h3 className="text-sm font-semibold mb-3 text-blue-400">
        交易统计 {selectedTokenAddress && '(当前代币)'}
      </h3>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* 基础统计 */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">总交易数:</span>
            <span className="font-semibold">{stats.totalTrades}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">买入次数:</span>
            <span className="font-semibold text-green-400">{stats.buyTrades}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">卖出次数:</span>
            <span className="font-semibold text-red-400">{stats.sellTrades}</span>
          </div>
        </div>

        {/* 高级统计 */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">总交易额:</span>
            <span className="font-semibold">${stats.totalVolume.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">平均价格:</span>
            <span className="font-semibold">${stats.averagePrice.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">买卖比:</span>
            <span className="font-semibold">
              {stats.sellTrades > 0 ? (stats.buyTrades / stats.sellTrades).toFixed(2) : '∞'}
            </span>
          </div>
        </div>
      </div>

      {/* 热门信息 */}
      {!selectedTokenAddress && (stats.topToken || stats.topWallet) && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="space-y-2 text-xs">
            {stats.topToken && (
              <div className="flex justify-between">
                <span className="text-gray-400">热门代币:</span>
                <span className="font-semibold text-blue-400">
                  {stats.topToken.symbol} ({stats.topToken.count}次)
                </span>
              </div>
            )}
            {stats.topWallet && (
              <div className="flex justify-between">
                <span className="text-gray-400">活跃钱包:</span>
                <span className="font-semibold text-purple-400 font-mono">
                  {stats.topWallet.address.slice(0, 6)}...({stats.topWallet.count}次)
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeHistoryStats; 