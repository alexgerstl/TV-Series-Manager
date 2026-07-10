import { beforeEach, describe, expect, it } from 'vitest';

import { TAB_KEYS, useUiStore } from '../../../../src/renderer/store/uiStore';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ activeTab: 'monitor' });
  });

  it('defaults to the monitor tab', () => {
    expect(useUiStore.getState().activeTab).toBe('monitor');
  });

  it('updates the active tab via setActiveTab', () => {
    useUiStore.getState().setActiveTab('settings');
    expect(useUiStore.getState().activeTab).toBe('settings');
  });

  it('TAB_KEYS lists exactly the six SRS §20 tabs, in display order', () => {
    expect(TAB_KEYS).toEqual(['monitor', 'lookup', 'nasSync', 'tools', 'settings', 'logs']);
  });
});
