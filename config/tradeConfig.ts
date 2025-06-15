/**
 * 交易配置文件 - 完整的EVM链支持
 * 支持所有主流EVM兼容链的交易配置
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

// 网络信息接口
export interface NetworkConfig {
  chainId: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  dex: {
    routerAddress: string;
    factoryAddress: string;
    wethAddress: string;
    name: string;
  };
  isTestnet: boolean;
  gasPrice?: string; // 建议的gas价格
}

// 完整的EVM链配置
export const EVM_NETWORKS: { [chainId: number]: NetworkConfig } = {
  // ============ 以太坊生态 ============
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    shortName: 'ETH',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    dex: {
      routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
      factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      name: 'Uniswap V2'
    },
    isTestnet: false,
    gasPrice: '20000000000' // 20 gwei
  },
  
  5: {
    chainId: 5,
    name: 'Goerli Testnet',
    shortName: 'Goerli',
    rpcUrl: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    explorerUrl: 'https://goerli.etherscan.io',
    nativeCurrency: { name: 'Goerli Ether', symbol: 'ETH', decimals: 18 },
    dex: {
      routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      wethAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
      name: 'Uniswap V2'
    },
    isTestnet: true,
    gasPrice: '10000000000' // 10 gwei
  },

  11155111: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    dex: {
      routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      wethAddress: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
      name: 'Uniswap V2'
    },
    isTestnet: true,
    gasPrice: '10000000000'
  },

  // ============ BSC生态 ============
  56: {
    chainId: 56,
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    rpcUrl: 'https://bsc-dataseed1.binance.org/',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    dex: {
      routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      factoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
      wethAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      name: 'PancakeSwap V2'
    },
    isTestnet: false,
    gasPrice: '5000000000' // 5 gwei
  },

  97: {
    chainId: 97,
    name: 'BSC Testnet',
    shortName: 'BSC-Test',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    explorerUrl: 'https://testnet.bscscan.com',
    nativeCurrency: { name: 'Test BNB', symbol: 'tBNB', decimals: 18 },
    dex: {
      routerAddress: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
      factoryAddress: '0x6725F303b657a9451d8BA641348b6761A6CC7a17',
      wethAddress: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
      name: 'PancakeSwap Testnet'
    },
    isTestnet: true,
    gasPrice: '10000000000'
  },

  // ============ Polygon生态 ============
  137: {
    chainId: 137,
    name: 'Polygon Mainnet',
    shortName: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com/',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    dex: {
      routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
      factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      wethAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
      name: 'QuickSwap'
    },
    isTestnet: false,
    gasPrice: '30000000000' // 30 gwei
  },

  80001: {
    chainId: 80001,
    name: 'Mumbai Testnet',
    shortName: 'Mumbai',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com/',
    explorerUrl: 'https://mumbai.polygonscan.com',
    nativeCurrency: { name: 'Test MATIC', symbol: 'MATIC', decimals: 18 },
    dex: {
      routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
      factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      wethAddress: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
      name: 'QuickSwap'
    },
    isTestnet: true,
    gasPrice: '1000000000'
  },

  // ============ Arbitrum生态 ============
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'ARB',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    dex: {
      routerAddress: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
      factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      wethAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      name: 'SushiSwap'
    },
    isTestnet: false,
    gasPrice: '100000000' // 0.1 gwei
  },

  421614: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    shortName: 'ARB-Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    dex: {
      routerAddress: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
      wethAddress: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
      name: 'SushiSwap'
    },
    isTestnet: true,
    gasPrice: '100000000'
  },

  // ============ Optimism生态 ============
  10: {
    chainId: 10,
    name: 'Optimism',
    shortName: 'OP',
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    dex: {
      routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
      factoryAddress: '0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf',
      wethAddress: '0x4200000000000000000000000000000000000006',
      name: 'Uniswap V2'
    },
    isTestnet: false,
    gasPrice: '1000000' // 0.001 gwei
  },

  11155420: {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    shortName: 'OP-Sepolia',
    rpcUrl: 'https://sepolia.optimism.io',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    dex: {
      routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      factoryAddress: '0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf',
      wethAddress: '0x4200000000000000000000000000000000000006',
      name: 'Uniswap V2'
    },
    isTestnet: true,
    gasPrice: '1000000'
  },

  // ============ Avalanche生态 ============
  43114: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    shortName: 'AVAX',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    dex: {
      routerAddress: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', // Trader Joe
      factoryAddress: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10',
      wethAddress: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
      name: 'Trader Joe'
    },
    isTestnet: false,
    gasPrice: '25000000000' // 25 gwei
  },

  43113: {
    chainId: 43113,
    name: 'Avalanche Fuji',
    shortName: 'FUJI',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    dex: {
      routerAddress: '0x2D99ABD9008Dc933ff5c0CD271B88309593aB921',
      factoryAddress: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10',
      wethAddress: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c',
      name: 'Trader Joe'
    },
    isTestnet: true,
    gasPrice: '25000000000'
  },

  // ============ Fantom生态 ============
  250: {
    chainId: 250,
    name: 'Fantom Opera',
    shortName: 'FTM',
    rpcUrl: 'https://rpc.ftm.tools/',
    explorerUrl: 'https://ftmscan.com',
    nativeCurrency: { name: 'Fantom', symbol: 'FTM', decimals: 18 },
    dex: {
      routerAddress: '0xF491e7B69E4244ad4002BC14e878a34207E38c29', // SpookySwap
      factoryAddress: '0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3',
      wethAddress: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83', // WFTM
      name: 'SpookySwap'
    },
    isTestnet: false,
    gasPrice: '1000000000000' // 1000 gwei
  },

  4002: {
    chainId: 4002,
    name: 'Fantom Testnet',
    shortName: 'FTM-Test',
    rpcUrl: 'https://rpc.testnet.fantom.network/',
    explorerUrl: 'https://testnet.ftmscan.com',
    nativeCurrency: { name: 'Fantom', symbol: 'FTM', decimals: 18 },
    dex: {
      routerAddress: '0xa6AD18C2aC47803E193F75c3677b14BF19B94883',
      factoryAddress: '0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3',
      wethAddress: '0xf1277d1Ed8AD466beddF92ef448A132661956621',
      name: 'SpookySwap'
    },
    isTestnet: true,
    gasPrice: '1000000000000'
  },

  // ============ Cronos生态 ============
  25: {
    chainId: 25,
    name: 'Cronos Mainnet',
    shortName: 'CRO',
    rpcUrl: 'https://evm.cronos.org',
    explorerUrl: 'https://cronoscan.com',
    nativeCurrency: { name: 'Cronos', symbol: 'CRO', decimals: 18 },
    dex: {
      routerAddress: '0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae', // VVS Finance
      factoryAddress: '0x3B44B2a187a7b3824131F8db5a74194D0a42Fc15',
      wethAddress: '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23', // WCRO
      name: 'VVS Finance'
    },
    isTestnet: false,
    gasPrice: '5000000000000' // 5000 gwei
  },

  338: {
    chainId: 338,
    name: 'Cronos Testnet',
    shortName: 'CRO-Test',
    rpcUrl: 'https://evm-t3.cronos.org',
    explorerUrl: 'https://testnet.cronoscan.com',
    nativeCurrency: { name: 'Test CRO', symbol: 'TCRO', decimals: 18 },
    dex: {
      routerAddress: '0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae',
      factoryAddress: '0x3B44B2a187a7b3824131F8db5a74194D0a42Fc15',
      wethAddress: '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23',
      name: 'VVS Finance'
    },
    isTestnet: true,
    gasPrice: '5000000000000'
  },

  // ============ Harmony生态 ============
  1666600000: {
    chainId: 1666600000,
    name: 'Harmony Mainnet',
    shortName: 'ONE',
    rpcUrl: 'https://api.harmony.one',
    explorerUrl: 'https://explorer.harmony.one',
    nativeCurrency: { name: 'ONE', symbol: 'ONE', decimals: 18 },
    dex: {
      routerAddress: '0x24ad62502d1C652Cc7684081169D04896aC20f30', // ViperSwap
      factoryAddress: '0x7D02c116b98d0965ba7B642ace0183ad8b8D2196',
      wethAddress: '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a', // WONE
      name: 'ViperSwap'
    },
    isTestnet: false,
    gasPrice: '1000000000' // 1 gwei
  },

  1666700000: {
    chainId: 1666700000,
    name: 'Harmony Testnet',
    shortName: 'ONE-Test',
    rpcUrl: 'https://api.s0.b.hmny.io',
    explorerUrl: 'https://explorer.pops.one',
    nativeCurrency: { name: 'ONE', symbol: 'ONE', decimals: 18 },
    dex: {
      routerAddress: '0x24ad62502d1C652Cc7684081169D04896aC20f30',
      factoryAddress: '0x7D02c116b98d0965ba7B642ace0183ad8b8D2196',
      wethAddress: '0x7a2afac38517d512E55C0bCe3b29d6b5f3e1de09',
      name: 'ViperSwap'
    },
    isTestnet: true,
    gasPrice: '1000000000'
  }
};

// 默认配置 - 支持所有EVM链
export const defaultTradeConfig: TradeConfig = {
  // RPC节点配置 - 包含所有支持的链
  rpcUrls: Object.fromEntries(
    Object.entries(EVM_NETWORKS).map(([chainId, config]) => [
      parseInt(chainId),
      config.rpcUrl
    ])
  ),
  
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
 * 获取网络配置
 */
export const getNetworkConfig = (chainId: number): NetworkConfig => {
  const config = EVM_NETWORKS[chainId];
  if (!config) {
    throw new Error(`不支持的链ID: ${chainId}`);
  }
  return config;
};

/**
 * 获取RPC URL
 */
export const getRpcUrl = (chainId: number): string => {
  const config = getNetworkConfig(chainId);
  return config.rpcUrl;
};

/**
 * 获取所有主网配置
 */
export const getMainnetConfigs = (): NetworkConfig[] => {
  return Object.values(EVM_NETWORKS).filter(config => !config.isTestnet);
};

/**
 * 获取所有测试网配置
 */
export const getTestnetConfigs = (): NetworkConfig[] => {
  return Object.values(EVM_NETWORKS).filter(config => config.isTestnet);
};

/**
 * 检查是否为测试网
 */
export const isTestnet = (chainId: number): boolean => {
  const config = EVM_NETWORKS[chainId];
  return config ? config.isTestnet : false;
};

/**
 * 获取推荐的Gas价格
 */
export const getRecommendedGasPrice = (chainId: number): string => {
  const config = getNetworkConfig(chainId);
  return config.gasPrice || '20000000000'; // 默认20 gwei
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

// 向后兼容的配置
export const MAINNET_CONFIG = {
  BSC: EVM_NETWORKS[56],
  ETH: EVM_NETWORKS[1],
  POLYGON: EVM_NETWORKS[137],
  ARBITRUM: EVM_NETWORKS[42161],
  OPTIMISM: EVM_NETWORKS[10],
  AVALANCHE: EVM_NETWORKS[43114],
  FANTOM: EVM_NETWORKS[250],
  CRONOS: EVM_NETWORKS[25],
  HARMONY: EVM_NETWORKS[1666600000]
};

// 环境变量示例（创建 .env.local 文件）
/*
# 主要RPC节点配置
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_api_key
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
POLYGON_RPC_URL=https://polygon-rpc.com/
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# 钱包私钥 (请妥善保管，不要泄露)
PRIVATE_KEY=your_wallet_private_key_here

# 是否启用真实交易 (设置为 true 启用)
ENABLE_REAL_TRADING=true

# 滑点容忍度 (百分比)
SLIPPAGE_TOLERANCE=5

# 默认链ID (可选，默认使用BSC)
DEFAULT_CHAIN_ID=56
*/ 