# Ambient Sound Widget — React Implementation Guide

> Covers the wavy equalizer bars, live toggle icon, premium volume slider,
> and the full AlgoTracker design system.

---

## 1. The Wavy Equalizer Bars

### Core Concept
When a track is **playing**, 4 animated bars appear at the bottom of the button.
Each bar bounces at a different speed/height to mimic a VU meter.
The bars are `position: absolute` — they **never affect layout flow**, so no reflow jank.

### React Component

```tsx
// AmbientButton.tsx
interface Props {
  trackKey: string;
  emoji: string;
  title: string;
  isPlaying: boolean;
  onClick: () => void;
}

export function AmbientButton({ trackKey, emoji, title, isPlaying, onClick }: Props) {
  return (
    <button
      className={`abt ${isPlaying ? 'abt--playing' : ''}`}
      data-track={trackKey}
      title={title}
      onClick={onClick}
    >
      <span className="abt__icon">{emoji}</span>
      {/* Bars always in DOM — opacity controlled by CSS */}
      <span className="abt__bars" aria-hidden="true">
        <span /><span /><span /><span />
      </span>
    </button>
  );
}
```

### CSS (or CSS Modules / styled-components)

```css
/* Base button */
.abt {
  background: #18181f;
  border: 1px solid #2a2a38;
  border-radius: 12px;
  width: 100%;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #9898b0;
  position: relative;
  transition: background 0.2s ease, border-color 0.2s ease,
              box-shadow 0.2s ease, color 0.2s ease;
}
.abt:hover {
  background: #1e1e28;
  transform: translateY(-2px);
  color: #e8e8f0;
}

/* Icon */
.abt__icon {
  display: block;
  font-size: 22px;
  line-height: 1;
  /* GPU-composited — NO font-size transition (causes reflow jank!) */
  transition: transform 0.25s ease;
  pointer-events: none;
}

/* Nudge icon up when playing — transform only, NOT font-size */
.abt--playing .abt__icon {
  transform: translateY(-7px);
}

/* Equalizer bars */
.abt__bars {
  position: absolute;        /* ← key: never affects layout */
  bottom: 7px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}
.abt--playing .abt__bars { opacity: 1; }

.abt__bars span {
  display: block;
  width: 3px;
  border-radius: 2px 2px 1px 1px;
  background: linear-gradient(to top, #06d6a0, rgba(6, 214, 160, 0.45));
  height: 4px;
  will-change: height;
}

/* Each bar: different speed + delay = organic feel */
.abt--playing .abt__bars span:nth-child(1) {
  animation: eq-b1 0.58s ease-in-out infinite alternate;
}
.abt--playing .abt__bars span:nth-child(2) {
  animation: eq-b2 0.73s ease-in-out infinite alternate 0.08s;
}
.abt--playing .abt__bars span:nth-child(3) {
  animation: eq-b3 0.62s ease-in-out infinite alternate 0.16s;
}
.abt--playing .abt__bars span:nth-child(4) {
  animation: eq-b4 0.79s ease-in-out infinite alternate 0.04s;
}

@keyframes eq-b1 { from { height: 3px; }  to { height: 13px; } }
@keyframes eq-b2 { from { height: 10px; } to { height: 4px;  } }
@keyframes eq-b3 { from { height: 13px; } to { height: 5px;  } }
@keyframes eq-b4 { from { height: 5px;  } to { height: 11px; } }

/* Outer pulse ring (optional — nice touch) */
.abt--playing {
  background: rgba(6, 214, 160, 0.12);
  border-color: #06d6a0;
  color: #06d6a0;
  box-shadow: 0 0 16px rgba(6, 214, 160, 0.25),
              inset 0 0 10px rgba(6, 214, 160, 0.06);
}
.abt--playing::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 16px;
  border: 2px solid rgba(6, 214, 160, 0.45);
  animation: pulse-ring 2.2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes pulse-ring {
  0%   { opacity: 0.6; transform: scale(1);    }
  70%  { opacity: 0;   transform: scale(1.25); }
  100% { opacity: 0;   transform: scale(1.25); }
}
```

---

## 2. Live Toggle Icon (🎵 → animated bars)

```tsx
// ToggleIcon.tsx
export function ToggleIcon({ isPlaying }: { isPlaying: boolean }) {
  if (!isPlaying) return <span className="toggle-icon">🎵</span>;

  return (
    <span className="toggle-icon">
      <span className="live-bars" aria-label="Playing">
        <span /><span /><span /><span />
      </span>
    </span>
  );
}
```

```css
.live-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 3px;
  height: 20px;
  padding-bottom: 1px;
}
.live-bars span {
  display: block;
  width: 3px;
  border-radius: 2px 2px 1px 1px;
  background: #7c6af7;          /* accent / purple */
  height: 4px;
  will-change: height;
}
.live-bars span:nth-child(1) { animation: lb1 0.58s ease-in-out infinite alternate; }
.live-bars span:nth-child(2) { animation: lb2 0.73s ease-in-out infinite alternate 0.08s; }
.live-bars span:nth-child(3) { animation: lb3 0.62s ease-in-out infinite alternate 0.16s; }
.live-bars span:nth-child(4) { animation: lb4 0.79s ease-in-out infinite alternate 0.04s; }

@keyframes lb1 { from { height: 4px;  } to { height: 20px; } }
@keyframes lb2 { from { height: 14px; } to { height: 6px;  } }
@keyframes lb3 { from { height: 18px; } to { height: 6px;  } }
@keyframes lb4 { from { height: 7px;  } to { height: 16px; } }
```

---

## 3. Premium Volume Slider (filled gradient track)

```tsx
// VolumeSlider.tsx
import { useRef, useEffect } from 'react';

export function VolumeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLInputElement>(null);

  // Update CSS variable for the filled-track gradient
  const updateFill = (val: number) => {
    ref.current?.style.setProperty('--fill', `${Math.round(val * 100)}%`);
  };

  useEffect(() => updateFill(value), [value]);

  return (
    <input
      ref={ref}
      type="range"
      className="vol-slider"
      min={0} max={1} step={0.002}
      value={value}
      onChange={e => {
        const v = parseFloat(e.target.value);
        updateFill(v);
        onChange(v);
      }}
    />
  );
}
```

```css
.vol-slider {
  --fill: 50%;
  flex: 1;
  appearance: none;
  background: transparent;
  height: 24px;
}
.vol-slider::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    #7c6af7 0%,
    #7c6af7 var(--fill),
    rgba(255,255,255,0.08) var(--fill),
    rgba(255,255,255,0.08) 100%
  );
}
.vol-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #7c6af7;
  margin-top: -6px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(124,106,247,0.5), 0 2px 6px rgba(0,0,0,0.35);
  transition: transform 0.1s, box-shadow 0.15s;
}
.vol-slider::-webkit-slider-thumb:hover {
  transform: scale(1.18);
  box-shadow: 0 0 16px rgba(124,106,247,0.65), 0 2px 8px rgba(0,0,0,0.4);
}
/* Firefox */
.vol-slider::-moz-range-progress { height: 6px; background: #7c6af7; border-radius: 3px; }
.vol-slider::-moz-range-track    { height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; }
.vol-slider::-moz-range-thumb    {
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; border: 2px solid #7c6af7;
  box-shadow: 0 0 10px rgba(124,106,247,0.5);
}
```

---

## 4. Full Design System (AlgoTracker Look)

### Color Palette (CSS Variables)
```css
:root {
  /* Backgrounds */
  --bg:       #0a0a0f;
  --surface:  #111118;
  --surface2: #18181f;
  --surface3: #1e1e28;

  /* Borders */
  --border:  #2a2a38;
  --border2: #363648;

  /* Text */
  --text:       #e8e8f0;
  --text-dim:   #9898b0;
  --text-muted: #6b6b85;

  /* Accent — Purple */
  --accent:       #7c6af7;
  --accent-light: #9180ff;
  --accent-rgb:   124, 106, 247;

  /* Difficulty */
  --easy:   #06d6a0;   /* green  */
  --medium: #f8b500;   /* amber  */
  --hard:   #ff4757;   /* red    */

  /* Blur surfaces */
  --surface-blur:  rgba(10,10,15,0.95);
  --overlay-bg:    rgba(0,0,0,0.75);
}
```

### Typography
```css
/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap');

body     { font-family: 'Syne', sans-serif; }
code, pre, .monospace { font-family: 'JetBrains Mono', monospace; }
```

### Glassmorphism Panel
```css
.glass-panel {
  background: var(--surface-blur);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
```

### Stat Cards
```css
.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 24px;
  transition: border-color 0.25s, box-shadow 0.25s;
}
.stat-card:hover {
  border-color: var(--border2);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}
```

### Accent Buttons
```css
.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-light));
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 4px 16px rgba(var(--accent-rgb), 0.35);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(var(--accent-rgb), 0.5);
}
.btn-primary:active { transform: scale(0.97); }
```

### Section Cards (collapsible)
```css
.section-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  margin-bottom: 8px;
}
/* Smooth expand / collapse — no JS height measurement needed */
.section-body {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.38s cubic-bezier(0.4, 0, 0.2, 1);
}
.section-body.collapsed {
  grid-template-rows: 0fr;
}
.section-body-inner {
  overflow: hidden;
  min-height: 0;
}
```

### Background Art (fixed image overlay)
```css
/* Applied to body::before */
.bg-art {
  position: fixed;
  inset: 0;
  background-image: url('/bg.png');
  background-size: cover;
  background-position: center top;
  transform: scale(1.2) translateY(-5vh);
  opacity: 0;
  z-index: -1;
  pointer-events: none;
  transition: opacity 0.8s ease;
  /* Chrome flicker fix: isolate from View Transitions root snapshot */
  view-transition-name: bg-art;
}
.bg-art.loaded { opacity: 0.28; }
```

> ⚠️ **Chrome flicker note (React Router / framer-motion users):**
> If you use `document.startViewTransition` anywhere, the fixed background will
> flicker in Chrome. Fix: **never route DOM-change transitions through
> `startViewTransition`** — use CSS transitions / framer-motion instead.
> Reserve `startViewTransition` only for full-page effects like theme switching.

---

## 5. Key "Don'ts" Learned from This Project

| ❌ Don't | ✅ Do instead |
|----------|--------------|
| Transition `font-size` on elements in a CSS Grid | Use `transform: scale()` |
| Use `contain: layout` on a `position: fixed` element | Leave it uncontained |
| Use `startViewTransition` for section open/close with a fixed bg | Use CSS `grid-template-rows` transitions |
| Set `height` on a scroll container manually | Use `height: Xpx` + `overflow-y: auto` + `scrollbar-width: none` |
