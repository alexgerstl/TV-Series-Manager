import { create } from 'zustand';

/** The six tabs from SRS §20, in display order. */
export const TAB_KEYS = ['monitor', 'lookup', 'nasSync', 'tools', 'settings', 'logs'] as const;
export type TabKey = (typeof TAB_KEYS)[number];

interface UiState {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

/**
 * First Zustand slice (architecture.md §3.1 `store/ # Zustand slices`) —
 * holds which tab is currently active. Later slices will mirror backend
 * state (settings, monitor results, NAS status, etc. — architecture.md
 * §1.2's "Zustand store (client-side UI state, mirrors backend state)").
 */
export const useUiStore = create<UiState>((set) => ({
  activeTab: 'monitor',
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },
}));
