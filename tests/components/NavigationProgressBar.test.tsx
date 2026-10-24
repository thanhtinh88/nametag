import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import NavigationProgressBar from '@/components/NavigationProgressBar';

let mockPathname = '/dashboard';
let mockSearchParams = new URLSearchParams('');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

describe('NavigationProgressBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPathname = '/dashboard';
    mockSearchParams = new URLSearchParams('');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders nothing initially when idle', () => {
    const { container } = render(<NavigationProgressBar />);
    expect(container.firstChild).toBeNull();
  });

  it('starts on internal link click and stays visible until pathname changes', () => {
    const { container, rerender } = render(
      <div>
        <NavigationProgressBar />
        <a href="/events/case-123" data-testid="case-link">
          Case 123
        </a>
      </div>
    );

    const link = screen.getByTestId('case-link');
    fireEvent.click(link);

    // After click, progress bar should be in the DOM
    const bar = container.querySelector('[aria-hidden="true"] > div');
    expect(bar).not.toBeNull();

    // Advance 500ms - it should still be loading, NOT finished!
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const activeBar = container.querySelector('[aria-hidden="true"] > div') as HTMLElement;
    expect(activeBar).not.toBeNull();
    expect(activeBar.style.opacity).toBe('1');
    expect(parseInt(activeBar.style.width, 10)).toBeGreaterThan(50);

    // Now simulate route change completing
    mockPathname = '/events/case-123';
    rerender(
      <div>
        <NavigationProgressBar />
        <a href="/events/case-123" data-testid="case-link">
          Case 123
        </a>
      </div>
    );

    // After route change, it should complete to 100%
    expect(activeBar.style.width).toBe('100%');

    // Advance 300ms to allow fade out and reset
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('ignores external, hash, or modified clicks', () => {
    const { container } = render(
      <div>
        <NavigationProgressBar />
        <a href="https://external.com" data-testid="ext-link">
          External
        </a>
        <a href="#section" data-testid="hash-link">
          Hash
        </a>
        <a href="/events" data-testid="ctrl-link">
          Ctrl
        </a>
      </div>
    );

    fireEvent.click(screen.getByTestId('ext-link'));
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();

    fireEvent.click(screen.getByTestId('hash-link'));
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();

    fireEvent.click(screen.getByTestId('ctrl-link'), { ctrlKey: true });
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
