"use client";

import { SiweMessage } from "siwe";

const DEFAULT_CHAIN_ID = 1;

export interface BuildMessageInput {
  address: string;
  domain: string;
  origin: string;
  nonce: string;
}

export function buildSiweMessage(input: BuildMessageInput): string {
  const message = new SiweMessage({
    domain: input.domain,
    address: input.address,
    statement: "Sign in to CryptoLens to save your watchlist across sessions.",
    uri: input.origin,
    version: "1",
    chainId: DEFAULT_CHAIN_ID,
    nonce: input.nonce,
    issuedAt: new Date().toISOString(),
  });
  return message.prepareMessage();
}
