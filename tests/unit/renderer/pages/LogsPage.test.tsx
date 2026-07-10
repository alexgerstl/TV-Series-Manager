// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LogsPage } from '../../../../src/renderer/pages/LogsPage';

afterEach(() => {
  cleanup();
});

describe('LogsPage', () => {
  it('renders without crashing', () => {
    render(<LogsPage />);
    expect(screen.getByRole('heading', { name: 'Logs' })).toBeInTheDocument();
  });
});
