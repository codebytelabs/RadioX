/**
 * Open URL outside the extension popup.
 * Must go through the service worker: chrome.tabs.create({ active: true }) from
 * the popup focuses a new tab, which closes the popup and can abort the call.
 */
export function openExternal(url: string, e?: { preventDefault(): void }): void {
  e?.preventDefault();
  if (!url || !/^https?:\/\//i.test(url)) return;

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    void chrome.runtime.sendMessage({ type: 'OPEN_EXTERNAL', url }).catch(() => {
      // SW asleep / missing handler — last-ditch fallbacks
      if (chrome.tabs?.create) void chrome.tabs.create({ url, active: false });
      else window.open(url, '_blank', 'noopener,noreferrer');
    });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
