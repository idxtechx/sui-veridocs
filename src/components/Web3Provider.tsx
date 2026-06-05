"use client";

import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Always use official public Sui Mainnet RPC for client-side stability
// This avoids exposing Tatum API key on frontend and prevents CORS/401 fetch errors on transaction broadcast
const SUI_MAINNET_RPC = "https://fullnode.mainnet.sui.io:443";

const { networkConfig } = createNetworkConfig({
  mainnet: {
    url: SUI_MAINNET_RPC,
    network: "mainnet" as const,
  },
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
