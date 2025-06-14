'use client';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'trade_bot_tokens';

export interface StoredToken {
  address: string;
  symbol: string;
  name: string;
  addedAt: number;
}

export const useTokenStorage = () => {
  const [storedTokens, setStoredTokens] = useState<StoredToken[]>([]);

  // 从localStorage加载代币
  const loadTokens = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const tokens = JSON.parse(stored);
        setStoredTokens(tokens);
      }
    } catch (error) {
      console.error('加载存储的代币失败:', error);
    }
  };

  // 保存代币到localStorage
  const saveTokens = (tokens: StoredToken[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
      setStoredTokens(tokens);
    } catch (error) {
      console.error('保存代币失败:', error);
    }
  };

  // 添加代币
  const addToken = (address: string, symbol: string, name: string) => {
    const newToken: StoredToken = {
      address: address.toLowerCase(),
      symbol,
      name,
      addedAt: Date.now()
    };

    // 检查是否已存在
    const exists = storedTokens.find(token => 
      token.address.toLowerCase() === address.toLowerCase()
    );

    if (exists) {
      return false; // 已存在
    }

    const updatedTokens = [...storedTokens, newToken];
    saveTokens(updatedTokens);
    return true;
  };

  // 删除代币
  const removeToken = (address: string) => {
    const updatedTokens = storedTokens.filter(token => 
      token.address.toLowerCase() !== address.toLowerCase()
    );
    saveTokens(updatedTokens);
  };

  // 清除所有代币
  const clearAllTokens = () => {
    setStoredTokens([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // 检查代币是否已存储
  const isTokenStored = (address: string) => {
    return storedTokens.some(token => 
      token.address.toLowerCase() === address.toLowerCase()
    );
  };

  // 获取代币数量
  const getTokenCount = () => storedTokens.length;

  // 初始化加载
  useEffect(() => {
    loadTokens();
  }, []);

  return {
    storedTokens,
    addToken,
    removeToken,
    clearAllTokens,
    isTokenStored,
    getTokenCount,
    loadTokens
  };
}; 