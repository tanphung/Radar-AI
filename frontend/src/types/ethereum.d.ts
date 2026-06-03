// EIP-1193 wallet provider exposed by browser extensions (MetaMask, Rabby, etc).
// Kept minimal — only the calls we use in the wallet connect flow.

interface EthereumProvider {
  request<T = unknown>(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<T>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(
    event: string,
    handler: (...args: unknown[]) => void,
  ): void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
