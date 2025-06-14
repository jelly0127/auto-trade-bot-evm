'use client';
import React from 'react';
import { useWalletData } from '@/hooks/useWalletData';

const WalletDataStatus: React.FC = () => {
  const { wallets, hasWallets, clearWallets } = useWalletData();

  if (!hasWallets()) {
    return null;
  }

  const handleClearData = () => {
    if (confirm('确定要清除所有本地存储的钱包数据吗？此操作不可恢复。')) {
      clearWallets();
    }
  };

  return (
    <div className="rounded-lg bg-green-50/10 border border-green-500/30 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-green-400">钱包数据已加载</h3>
          <p className="text-xs text-green-300">
            已导入 {wallets.length} 个钱包地址，可在各功能模块中使用
          </p>
        </div>
        <button
          onClick={handleClearData}
          className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
          title="删除所有本地存储的钱包数据"
        >
          清除本地钱包数据
        </button>
      </div>
    </div>
  );
};

export default WalletDataStatus; 