// Stubbed by scripts/rebrand.ts — DCI Learning Academy unlocks all content.
interface PremiumStatus {
  isPremium: boolean;
  isLoading: boolean;
  refreshPremiumStatus: () => Promise<void>;
}

export function usePremiumStatus(): PremiumStatus {
  return {
    isPremium: true,
    isLoading: false,
    refreshPremiumStatus: async () => {},
  };
}

export async function setPremiumStatus(_isPremium: boolean): Promise<void> {
  // no-op
}
