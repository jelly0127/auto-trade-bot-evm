'use client';
import React from 'react';
import { useWalletData } from '@/hooks/useWalletData';

const WalletDataStatus = () => {
  const { wallets, hasWallets, getWalletCount } = useWalletData();

  return (
    <div className="fixed bottom-4 right-4 rounded-lg bg-black/80 p-3 text-white text-sm">
      <div className="space-y-1">
        <p className="font-semibold">钱包数据状态</p>
        <p>数量: {getWalletCount()}</p>
        <p>状态: {hasWallets() ? '✅ 已导入' : '❌ 未导入'}</p>
        {hasWallets() && (
          <div className="text-xs text-gray-300">
            <p>最新地址: {wallets[0]?.address.slice(0, 10)}...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletDataStatus; 