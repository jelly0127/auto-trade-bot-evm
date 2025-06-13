'use client';
import { wagmiAdapter, projectId, networks, testnetNetworks } from '@/config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import React, { type ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';

// Set up queryClient
const queryClient = new QueryClient();

if (!projectId) {
  throw new Error('Project ID is not defined');
}

// Set up metadata
const metadata = {
  name: 'Market Bot - EVM Wallet Manager',
  description: 'Comprehensive EVM wallet management with batch operations across all major chains',
  url: 'https://market-bot.com',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
};

// Create the modal with all EVM networks
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: networks as any, // 包含所有主网和测试网
  defaultNetwork: testnetNetworks[2], // 默认使用BSC测试网
  metadata: metadata,
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'x', 'github', 'discord', 'apple'],
    emailShowWallets: true,
  },
});

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default ContextProvider;
