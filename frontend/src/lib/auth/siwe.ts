"use client";

import { SiweMessage } from "siwe";
import { getAddress } from "viem";

const DEFAULT_CHAIN_ID = 1;

export interface BuildMessageInput {
  address: string;
  domain: string;
  origin: string;
  nonce: string;
}

/**
 * Build the EIP-4361 message string. Wallets that return lowercase addresses
 * from eth_requestAccounts (OKX, some Coinbase versions) fail the SIWE spec's
 * EIP-55 check at SiweMessage construction with "invalid EIP-55 address" on
 * line 2. viem.getAddress() normalizes to checksummed form for any case.
 */
export function buildSiweMessage(input: BuildMessageInput): string {
  const message = new SiweMessage({
    domain: input.domain,
    address: getAddress(input.address),
    statement: "Sign in to CryptoLens to save your watchlist across sessions.",
    uri: input.origin,
    version: "1",
    chainId: DEFAULT_CHAIN_ID,
    nonce: input.nonce,
    issuedAt: new Date().toISOString(),
  });
  return message.prepareMessage();
}
