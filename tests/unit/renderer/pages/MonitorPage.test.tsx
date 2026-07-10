// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MonitorPage } from '../../../../src/renderer/pages/MonitorPage';

afterEach(() => {
  cleanup();
});

describe('MonitorPage', () => {
  it('renders without crashing', () => {
    render(<MonitorPage />);
    expect(screen.getByRole('heading', { name: 'Monitor' })).toBeInTheDocument();
  });
});
