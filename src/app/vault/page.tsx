import type { Metadata } from "next";
import { EncryptedVault } from "@/components/EncryptedVault";

export const metadata: Metadata = {
  title: "Encrypted Vault",
  description: "Results you chose to save, encrypted with your passphrase and kept in this browser only.",
};

// Rendered per request only so that it gets the CSP nonce (src/proxy.ts); it reads no request data.

export default function VaultPage() {
  return <EncryptedVault />;
}
