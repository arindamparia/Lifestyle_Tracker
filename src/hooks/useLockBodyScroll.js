import { useEffect } from 'react';

// Global counter to track multiple stacked modals
let openCount = 0;
let scrollPosition = 0;

export default function useLockBodyScroll(isOpen) {
  useEffect(() => {
    if (!isOpen) return;

    openCount++;
    
    // Only apply scroll lock when the FIRST modal opens
    if (openCount === 1) {
      scrollPosition = window.scrollY || window.pageYOffset;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      // The only foolproof way to stop background scroll on iOS Safari
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPosition}px`;
      document.body.style.width = '100%';
    }

    return () => {
      openCount--;
      
      // Only remove scroll lock when the LAST modal closes
      if (openCount === 0) {
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Restore previous scroll position
        window.scrollTo(0, scrollPosition);
      }
    };
  }, [isOpen]);
}
