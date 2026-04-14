// Stubbed by scripts/rebrand.ts — no monetization in the DCI classroom build.
export type PurchaseError = "cancelled" | "already_owned" | "network" | "unknown";

interface PurchaseResult {
  success: boolean;
  error?: PurchaseError;
}

interface UsePurchase {
  purchase: (productId: string, isSubscription?: boolean) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  isPurchasing: boolean;
  isRestoring: boolean;
}

export function usePurchase(): UsePurchase {
  return {
    purchase: async () => ({ success: false, error: "unknown" }),
    restore: async () => ({ success: false, error: "unknown" }),
    isPurchasing: false,
    isRestoring: false,
  };
}
