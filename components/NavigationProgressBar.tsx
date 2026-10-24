'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const isNavigatingRef = useRef(false);
  const currentPathRef = useRef(`${pathname}?${searchParams?.toString() || ''}`);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const startProgress = useCallback(() => {
    clearTimers();
    isNavigatingRef.current = true;
    setIsFinishing(false);
    setVisible(true);
    setProgress(25);

    // Progressive incremental movement while waiting for server response
    const t1 = setTimeout(() => {
      setProgress(50);
    }, 180);

    const t2 = setTimeout(() => {
      setProgress(72);
    }, 450);

    const t3 = setTimeout(() => {
      setProgress(86);
    }, 1000);

    const t4 = setTimeout(() => {
      setProgress(93);
    }, 2200);

    // Failsafe timeout in case navigation is aborted or cancelled
    const tFail = setTimeout(() => {
      isNavigatingRef.current = false;
      setIsFinishing(true);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }, 10000);

    timersRef.current = [t1, t2, t3, t4, tFail];
  }, [clearTimers]);

  const completeProgress = useCallback(() => {
    clearTimers();
    isNavigatingRef.current = false;
    setProgress(100);
    setIsFinishing(true);

    const tEnd = setTimeout(() => {
      setVisible(false);
      setProgress(0);
      setIsFinishing(false);
    }, 250);

    timersRef.current = [tEnd];
  }, [clearTimers]);

  // When pathname or searchParams ACTUALLY changes, complete the progress bar!
  useEffect(() => {
    const newPath = `${pathname}?${searchParams?.toString() || ''}`;
    if (newPath !== currentPathRef.current) {
      currentPathRef.current = newPath;
      if (isNavigatingRef.current) {
        completeProgress();
      }
    }
  }, [pathname, searchParams, completeProgress]);

  // Global click listener for internal navigation links
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore right clicks or modified clicks (open in new tab/window)
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) {
        return;
      }

      // Find closest anchor tag
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }

      if (!target || target.tagName !== 'A') {
        return;
      }

      const anchor = target as HTMLAnchorElement;
      const href = anchor.getAttribute('href');

      if (!href) return;

      // Ignore external, download, tel, mailto, javascript, or hash-only links
      if (
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        href.startsWith('#')
      ) {
        return;
      }

      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Must be same origin
        if (targetUrl.origin !== currentUrl.origin) {
          return;
        }

        // Ignore hash jump on the same pathname and search
        if (
          targetUrl.pathname === currentUrl.pathname &&
          targetUrl.search === currentUrl.search
        ) {
          return;
        }

        // Genuine internal navigation detected -> start progress bar and KEEP it running!
        startProgress();
      } catch {
        // Ignore invalid URLs
      }
    };

    const handlePopState = () => {
      startProgress();
    };

    document.addEventListener('click', handleDocumentClick, { capture: true });
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
      window.removeEventListener('popstate', handlePopState);
      clearTimers();
    };
  }, [clearTimers, startProgress]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] z-[99999] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="h-full bg-primary shadow-[0_0_10px_var(--primary),0_0_4px_var(--primary)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          opacity: isFinishing ? 0 : 1,
          transitionDuration: isFinishing ? '200ms' : '220ms',
        }}
      />
    </div>
  );
}
