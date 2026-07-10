// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ToolsPage } from '../../../../src/renderer/pages/ToolsPage';

afterEach(() => {
  cleanup();
});

describe('ToolsPage', () => {
  it('renders without crashing', () => {
    render(<ToolsPage />);
    expect(screen.getByRole('heading', { name: 'Tools' })).toBeInTheDocument();
  });
});
