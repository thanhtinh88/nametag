import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import UnifiedNetworkGraph from '../../components/UnifiedNetworkGraph';
import viMessages from '../../locales/vi-VN.json';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => '/dashboard'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

describe('UnifiedNetworkGraph Toolbar Controls', () => {
  beforeEach(() => {
    // Setup ResizeObserver mock
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    // Setup canvas mocks in jsdom
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      setTransform: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 50 }),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
    });

    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
    });
  });

  const renderComponent = () =>
    render(
      <NextIntlClientProvider locale="vi" messages={viMessages}>
        <UnifiedNetworkGraph />
      </NextIntlClientProvider>
    );

  it('renders increase and decrease distance buttons along with reset layout and recenter', () => {
    renderComponent();

    const increaseBtn = screen.getByRole('button', { name: /Tăng khoảng cách đối tượng/i });
    const decreaseBtn = screen.getByRole('button', { name: /Giảm khoảng cách đối tượng/i });
    const resetBtn = screen.getByRole('button', { name: /Đặt lại bố cục mặc định/i });
    const recenterBtn = screen.getByRole('button', { name: /Căn giữa đồ thị/i });

    expect(increaseBtn).toBeInTheDocument();
    expect(decreaseBtn).toBeInTheDocument();
    expect(resetBtn).toBeInTheDocument();
    expect(recenterBtn).toBeInTheDocument();

    expect(increaseBtn).toHaveAttribute('title', expect.stringContaining('100%'));
    expect(decreaseBtn).toHaveAttribute('title', expect.stringContaining('100%'));
  });

  it('updates distance scale percentage on increase and decrease button clicks', async () => {
    const user = userEvent.setup();
    renderComponent();

    const increaseBtn = screen.getByRole('button', { name: /Tăng khoảng cách đối tượng/i });
    const decreaseBtn = screen.getByRole('button', { name: /Giảm khoảng cách đối tượng/i });
    const resetBtn = screen.getByRole('button', { name: /Đặt lại bố cục mặc định/i });

    // Click increase
    await user.click(increaseBtn);
    expect(increaseBtn).toHaveAttribute('title', expect.stringContaining('125%'));
    expect(decreaseBtn).toHaveAttribute('title', expect.stringContaining('125%'));

    // Click increase again
    await user.click(increaseBtn);
    expect(increaseBtn).toHaveAttribute('title', expect.stringContaining('150%'));

    // Click decrease
    await user.click(decreaseBtn);
    expect(increaseBtn).toHaveAttribute('title', expect.stringContaining('125%'));

    // Click reset layout: resets back to 100%
    await user.click(resetBtn);
    expect(increaseBtn).toHaveAttribute('title', expect.stringContaining('100%'));
    expect(decreaseBtn).toHaveAttribute('title', expect.stringContaining('100%'));
  });
});
