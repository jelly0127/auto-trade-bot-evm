import { cookieStorage, createStorage, http } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import {
  // 主网
  mainnet,
  bsc,
  polygon,
  arbitrum,
  optimism,
  avalanche,
  fantom,
  gnosis,
  celo,
  moonbeam,
  moonriver,
  cronos,

  // 测试网
  sepolia,
  goerli,
  bscTestnet,
  polygonMumbai,
  arbitrumSepolia,
  optimismSepolia,
  avalancheFuji,
  fantomTestnet,
  celoAlfajores,
  moonbaseAlpha,
  cronosTestnet,
} from '@reown/appkit/networks';

// Get projectId from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error('Project ID is not defined');
}

// 主网网络
export const mainnetNetworks = [
  mainnet, // Ethereum
  bsc, // BSC
  polygon, // Polygon
  arbitrum, // Arbitrum One
  optimism, // Optimism
  avalanche, // Avalanche
  fantom, // Fantom
  gnosis, // Gnosis Chain
  celo, // Celo
  moonbeam, // Moonbeam
  moonriver, // Moonriver
  cronos, // Cronos
];

// 测试网网络
export const testnetNetworks = [
  sepolia, // Ethereum Sepolia
  goerli, // Ethereum Goerli
  bscTestnet, // BSC Testnet
  polygonMumbai, // Polygon Mumbai
  arbitrumSepolia, // Arbitrum Sepolia
  optimismSepolia, // Optimism Sepolia
  avalancheFuji, // Avalanche Fuji
  fantomTestnet, // Fantom Testnet
  celoAlfajores, // Celo Alfajores
  moonbaseAlpha, // Moonbase Alpha
  cronosTestnet, // Cronos Testnet
];

// 所有网络
export const networks = [...mainnetNetworks, ...testnetNetworks];

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
