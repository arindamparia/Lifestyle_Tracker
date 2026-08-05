---
name: frontend-ui-engineering
description: Modern frontend architecture, responsive layouts, decluttering mobile views vs desktop experiences, micro-animations, glassmorphism, and performance-first web design patterns.
---

# Frontend UI Engineering & Mobile-First Decluttering

## Principles
1. **Mobile Simplicity vs Desktop Richness**:
   - On Mobile: Focus strictly on day-to-day actionable tasks, primary metrics (Water, Current Task, Action Items), collapsible secondary panels, thumb-friendly tap targets (min 44px), and sticky bottom/top bars.
   - On Desktop: Expand multi-column dashboards, persistent sidebar/stats, detailed workout step breakdowns, and full keyboard navigation.
2. **Visual Hierarchy & Congestion Relief**:
   - Use whitespace generously (16px–24px card paddings, 12px gap between list items).
   - Hide redundant repetitive meta-text on mobile; reveal via interactive modal or subtle info tooltip.
   - Group related habits into collapsible section accordions or segmented filters (e.g. "All", "Pending", "Done").
3. **Glassmorphism & Micro-Interactions**:
   - Multi-layered backdrop-filters (`backdrop-filter: blur(16px) saturate(180%)`).
   - Smooth transform transitions on press (`transform: scale(0.98)`).
   - High-contrast typography with modern font scales (Inter / System font stack).
4. **Performance & Security**:
   - Zero layout shift (CLS < 0.1).
   - Biometric WebAuthn (Passkeys) integration with secure cryptographic verification.
   - Reactive background sync with optimistic UI updates.
