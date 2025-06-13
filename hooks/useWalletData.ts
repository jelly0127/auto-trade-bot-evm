import { useState, useEffect } from 'react';

export interface WalletData {
  address: string;
  privateKey: string;
}

const WALLET_STORAGE_KEY = 'imported_wallets';

export const useWalletData = () => {
  const [wallets, setWallets] = useState<WalletData[]>([]);

  // 从localStorage加载钱包数据
  useEffect(() => {
    try {
      const storedWallets = localStorage.getItem(WALLET_STORAGE_KEY);
      if (storedWallets) {
        const parsedWallets = JSON.parse(storedWallets);
        setWallets(parsedWallets);
      }
    } catch (error) {
      console.error('加载钱包数据失败:', error);
    }
  }, []);

  // 保存钱包数据到localStorage
  const saveWallets = (newWallets: WalletData[]) => {
    try {
      setWallets(newWallets);
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(newWallets));
    } catch (error) {
      console.error('保存钱包数据失败:', error);
    }
  };

  // 添加钱包
  const addWallets = (newWallets: WalletData[]) => {
    const updatedWallets = [...wallets, ...newWallets];
    saveWallets(updatedWallets);
  };

  // 清空钱包
  const clearWallets = () => {
    setWallets([]);
    localStorage.removeItem(WALLET_STORAGE_KEY);
  };

  // 获取钱包数量
  const getWalletCount = () => wallets.length;

  // 检查是否有钱包数据
  const hasWallets = () => wallets.length > 0;

  return {
    wallets,
    saveWallets,
    addWallets,
    clearWallets,
    getWalletCount,
    hasWallets,
  };
}; 