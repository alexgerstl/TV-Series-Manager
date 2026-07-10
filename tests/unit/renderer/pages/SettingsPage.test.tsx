// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SettingsPage } from '../../../../src/renderer/pages/SettingsPage';

afterEach(() => {
  cleanup();
});

describe('SettingsPage', () => {
  it('renders without crashing', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });
});
