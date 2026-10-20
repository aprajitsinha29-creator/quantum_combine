// Rename regression tests: the product is now "QPath" (cap Q, cap P, no space).
// Covers (1) the header brand text, (2) the footer, (3) the HTML <title> /
// document.title, and (4) the 404 page — none may still say "Quantum Pathfinder".
// Also covers embed mode (Ananta Careers iframe): no header/nav/footer, notice kept.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './components/layout/AppShell';
import { NotFoundPage } from './pages/NotFoundPage';

// Mock the health badge so the shell test stays isolated from its query.
vi.mock('./features/health/components/HealthBadge', () => ({
  HealthBadge: () => <div>health</div>,
}));

// Control the Ananta import notice without real messaging; default is the
// standalone no-op shape (no imported skills, empty notice).
let mockImported: string[] = [];
vi.mock('./features/ananta/useAnantaBridge', () => ({
  useAnantaBridge: () => ({ imported: mockImported, dismiss: () => {} }),
}));

// Control what the chosen-path query returns.
const mockUseChosenPath = vi.fn();
vi.mock('./features/tracker/hooks/useTracker', () => ({
  useChosenPath: (...args: unknown[]) => mockUseChosenPath(...args),
}));

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <AppShell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

let parentWasStubbed = false;

// window.parent is a jsdom accessor; note when it was redefined and restore a
// plain parent-to-window property afterwards so the standalone (default)
// behaviour is intact for every other test (same pattern as useAnantaBridge.test.tsx).
function stubParent(value: Partial<Window>): void {
  Object.defineProperty(window, 'parent', { configurable: true, value });
  parentWasStubbed = true;
}

beforeEach(() => {
  vi.clearAllMocks();
  document.title = 'QPath';
  mockImported = [];
  parentWasStubbed = false;
});

afterEach(() => {
  if (parentWasStubbed) {
    Object.defineProperty(window, 'parent', { configurable: true, value: window });
    parentWasStubbed = false;
  }
});

describe('QPath rename', () => {
  it('test_header_renders_qpath_and_not_quantum_pathfinder', () => {
    mockUseChosenPath.mockReturnValue({ data: { profile_id: 'p1', chosen_path_id: null } });
    renderShell();
    expect(screen.getByRole('link', { name: /QPath/ })).toBeInTheDocument();
    expect(screen.queryByText('Quantum Pathfinder')).not.toBeInTheDocument();
  });

  it('test_footer_uses_qpath_branding', () => {
    mockUseChosenPath.mockReturnValue({ data: { profile_id: 'p1', chosen_path_id: null } });
    renderShell();
    const footer = screen.getByText(/Live-data career navigator for quantum computing/);
    expect(footer).toHaveTextContent('QPath');
    expect(footer).not.toHaveTextContent('Quantum Pathfinder');
  });

  it('test_document_title_contains_qpath', () => {
    // Vite serves index.html, whose <title> is the initial document title.
    expect(document.title).toContain('QPath');
    expect(document.title).not.toContain('Quantum Pathfinder');
  });

  it('test_404_page_wordmark_is_qpath', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    const notice = screen.getByText(/The requested path does not exist in/);
    expect(notice).toHaveTextContent('QPath');
    expect(notice).not.toHaveTextContent('Quantum Pathfinder');
  });
});

describe('AppShell embed mode', () => {
  it('test_embedded_renders_no_header_nav_or_footer_but_keeps_notice', () => {
    stubParent({ postMessage: () => {} }); // simulate the Ananta iframe
    mockImported = ['Quantum mechanics'];
    renderShell();

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    // The Ananta import notice still renders inside the iframe.
    expect(screen.getByRole('status')).toHaveTextContent(/Imported \d+ skills? from Ananta/);
  });

  it('test_standalone_renders_header_nav_and_footer', () => {
    // Default jsdom: window.parent === window, i.e. standalone.
    renderShell();

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main Navigation' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
