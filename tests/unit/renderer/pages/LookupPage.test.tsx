// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LookupPage } from '../../../../src/renderer/pages/LookupPage';

afterEach(() => {
  cleanup();
});

describe('LookupPage', () => {
  it('renders without crashing', () => {
    render(<LookupPage />);
    expect(screen.getByRole('heading', { name: 'Lookup' })).toBeInTheDocument();
  });
});
