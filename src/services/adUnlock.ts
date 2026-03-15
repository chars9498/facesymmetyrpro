/**
 * Ad Unlock Service
 * 
 * This service handles the "rewarded ad" flow.
 * Currently, it implements a simulated 5-second delay to mimic an ad experience.
 * 
 * FUTURE INTEGRATION:
 * - For Native Android (AdMob): Use a JS-to-Native bridge (e.g., Capacitor/Cordova) to trigger real rewarded ads.
 * - For Web (GAM/GPT): Use the Google Publisher Tag (GPT) rewarded ad API.
 */

export interface AdUnlockProvider {
  watchAd: (onProgress?: (secondsLeft: number) => void) => Promise<boolean>;
}

/**
 * Simulated Provider (Current Production Default)
 */
const simulatedProvider: AdUnlockProvider = {
  watchAd: async (onProgress) => {
    return new Promise((resolve) => {
      let secondsLeft = 5;
      if (onProgress) onProgress(secondsLeft);
      
      const interval = setInterval(() => {
        secondsLeft -= 1;
        if (onProgress) onProgress(secondsLeft);
        
        if (secondsLeft <= 0) {
          clearInterval(interval);
          resolve(true);
        }
      }, 1000);
    });
  }
};

// Export the active provider
// You can swap 'simulatedProvider' with a real implementation here in the future.
export const adService: AdUnlockProvider = simulatedProvider;

/**
 * Convenience wrapper for the UI components
 */
export const watchAdToUnlock = (onProgress?: (secondsLeft: number) => void) => {
  return adService.watchAd(onProgress);
};
