/**
 * 交易配置文件
 * 在这里配置你的交易参数
 */

export interface TradeConfig {
  // RPC节点配置
  rpcUrls: {
    [chainId: number]: string;
  };
  
  // 滑点容忍度配置
  slippageTolerance: number;
  
  // Gas配置
  gasLimit: number;
  
  // 是否启用真实交易
  enableRealTrading: boolean;
  
  // 私钥存储方式
  privateKeySource: 'env' | 'config' | 'wallet_data';
}

// 默认配置 - 已启用真实交易
export const defaultTradeConfig: TradeConfig = {
  // RPC节点配置 - 使用高质量的RPC节点
  rpcUrls: {
    56: 'https://bsc-dataseed1.binance.org/', // BSC 主网
    97: 'https://data-seed-prebsc-1-s1.binance.org:8545/', // BSC 测试网
    1: 'https://eth-mainnet.g.alchemy.com/v2/demo', // Ethereum 主网
    137: 'https://polygon-rpc.com/', // Polygon 主网
  },
  
  // 滑点容忍度 (5% - 适合主网交易)
  slippageTolerance: 5,
  
  // Gas限制
  gasLimit: 500000,
  
  // 启用真实交易
  enableRealTrading: true,
  
  // 使用导入的钱包数据作为私钥来源
  privateKeySource: 'wallet_data',
};

/**
 * 获取RPC URL
 */
export const getRpcUrl = (chainId: number): string => {
  const url = defaultTradeConfig.rpcUrls[chainId];
  if (!url) {
    throw new Error(`不支持的链ID: ${chainId}`);
  }
  return url;
};

/**
 * 验证配置
 */
export const validateConfig = (): boolean => {
  try {
    // 检查RPC URL
    for (const [chainId, url] of Object.entries(defaultTradeConfig.rpcUrls)) {
      if (!url || url.includes('YOUR_')) {
        console.warn(`链 ${chainId} 的RPC URL 未配置`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('配置验证失败:', error);
    return false;
  }
};

/**
 * 主网交易配置
 */
export const MAINNET_CONFIG = {
  // BSC 主网配置
  BSC: {
    chainId: 56,
    name: 'BSC Mainnet',
    rpcUrl: 'https://bsc-dataseed1.binance.org/',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    // PancakeSwap V2 配置
    dex: {
      routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      factoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
      wethAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      name: 'PancakeSwap'
    }
  }
};

// 环境变量示例（创建 .env.local 文件）
/*
# BSC 主网 RPC (可以使用免费的公共节点或付费节点)
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# 钱包私钥 (请妥善保管，不要泄露)
PRIVATE_KEY=your_wallet_private_key_here

# 是否启用真实交易 (设置为 true 启用)
ENABLE_REAL_TRADING=true

# 滑点容忍度 (百分比)
SLIPPAGE_TOLERANCE=5
*/ 