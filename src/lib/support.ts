/**
 * Tip / supporter state — honor system, no ads, no analytics.
 *
 * Delivery: put SUPPORTER_CODE on the Buy Me a Coffee / Ko-fi thank-you page
 * (or tip confirmation email). Supporters paste it in Settings → Unlock.
 * There is no auto-webhook; same shared honor-system code for all tippers.
 */
export const SUPPORT_TIP_URL = 'https://buymeacoffee.com/codebytelabs';
export const SUPPORT_KOFI_URL = 'https://ko-fi.com/codebytelabs';

export const SUPPORTER_CODE = 'RADIOX-SUPPORTER';

const KEYS = {
  sessionCount: 'rx_sessionCount',
  listenSeconds: 'rx_listenSeconds',
  supportPromptState: 'rx_supportPromptState',
  supporter: 'supporter', // also mirrored in settings.supporter
} as const;

export type SupportPromptState = 'pending' | 'shown' | 'dismissed';

export type SupportState = {
  sessionCount: number;
  listenSeconds: number;
  supportPromptState: SupportPromptState;
  supporter: boolean;
};

const DEFAULTS: SupportState = {
  sessionCount: 0,
  listenSeconds: 0,
  supportPromptState: 'pending',
  supporter: false,
};

export async function getSupportState(): Promise<SupportState> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return { ...DEFAULTS };
  const data = await chrome.storage.local.get([
    KEYS.sessionCount,
    KEYS.listenSeconds,
    KEYS.supportPromptState,
    KEYS.supporter,
    'settings',
  ]);
  const settings = (data.settings || {}) as { supporter?: boolean };
  const fromSettings = Boolean(settings.supporter);
  return {
    sessionCount: Number(data[KEYS.sessionCount]) || 0,
    listenSeconds: Number(data[KEYS.listenSeconds]) || 0,
    supportPromptState: (data[KEYS.supportPromptState] as SupportPromptState) || 'pending',
    supporter: Boolean(data[KEYS.supporter]) || fromSettings,
  };
}

export async function bumpSession(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  const { sessionCount } = await getSupportState();
  await chrome.storage.local.set({ [KEYS.sessionCount]: sessionCount + 1 });
}

export async function addListenSeconds(seconds: number): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  if (seconds <= 0) return;
  const { listenSeconds } = await getSupportState();
  await chrome.storage.local.set({ [KEYS.listenSeconds]: listenSeconds + Math.floor(seconds) });
}

export async function dismissSupportPrompt(): Promise<void> {
  await chrome.storage.local.set({ [KEYS.supportPromptState]: 'dismissed' });
}

export async function markSupportPromptShown(): Promise<void> {
  const s = await getSupportState();
  if (s.supportPromptState === 'pending') {
    await chrome.storage.local.set({ [KEYS.supportPromptState]: 'shown' });
  }
}

export async function setSupporter(on: boolean): Promise<void> {
  await chrome.storage.local.set({ [KEYS.supporter]: on });
}

/** Show tip row after ≥10 sessions AND ≥60 min listen; never again after dismiss. */
export function shouldShowTipRow(state: SupportState): boolean {
  if (state.supporter) return false;
  if (state.supportPromptState === 'dismissed') return false;
  return state.sessionCount >= 10 && state.listenSeconds >= 60 * 60;
}

export const FREE_TRACK_LOG_LIMIT = 50;
