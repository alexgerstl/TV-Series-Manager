// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../../../src/renderer/App';
import { useUiStore } from '../../../src/renderer/store';

const TAB_LABELS = ['Monitor', 'Lookup', 'NAS Sync', 'Tools', 'Settings', 'Logs'];

describe('App', () => {
  beforeEach(() => {
    useUiStore.setState({ activeTab: 'monitor' });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all six SRS §20 tabs with no console errors', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<App />);

    for (const label of TAB_LABELS) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  describe('tab navigation', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('shows the Monitor page by default', () => {
      render(<App />);
      expect(screen.getByRole('heading', { name: 'Monitor' })).toBeInTheDocument();
    });

    it.each([
      ['Lookup', 'Lookup'],
      ['NAS Sync', 'NAS Sync'],
      ['Tools', 'Tools'],
      ['Settings', 'Settings'],
      ['Logs', 'Logs'],
    ])('clicking the %s tab renders the %s page', (tabLabel, headingText) => {
      render(<App />);

      fireEvent.click(screen.getByRole('tab', { name: tabLabel }));

      expect(screen.getByRole('heading', { name: headingText })).toBeInTheDocument();
    });
  });
});
