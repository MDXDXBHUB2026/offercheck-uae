import type { Metadata } from "next";
import { EncryptedVault } from "@/components/EncryptedVault";

export const metadata: Metadata = {
  title: "Encrypted Vault",
  description: "Results you chose to save, encrypted with your passphrase and kept in this browser only.",
};

export const dynamic = "force-static";

export default function VaultPage() {
  return <EncryptedVault />;
}
