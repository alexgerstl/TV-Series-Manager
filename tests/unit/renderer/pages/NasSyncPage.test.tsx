// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { NasSyncPage } from '../../../../src/renderer/pages/NasSyncPage';

afterEach(() => {
  cleanup();
});

describe('NasSyncPage', () => {
  it('renders without crashing', () => {
    render(<NasSyncPage />);
    expect(screen.getByRole('heading', { name: 'NAS Sync' })).toBeInTheDocument();
  });
});
