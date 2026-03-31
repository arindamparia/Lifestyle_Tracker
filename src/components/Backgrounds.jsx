import React, { useEffect, useState } from 'react';

const STOPS = [
  { time: 0,  c1: [25, 12, 55],    c2: [12, 28, 58],    c3: [35, 10, 48] }, // Midnight: Deep Indigo, Navy, Purple void
  { time: 6,  c1: [75, 20, 38],    c2: [90, 38, 15],    c3: [70, 15, 48] }, // Dawn: Deep Berry, Burnt Amber, Magenta
  { time: 10, c1: [12, 45, 55],    c2: [15, 38, 70],    c3: [20, 50, 42] }, // Morning: Oceanic, Deep Azure, Forest
  { time: 14, c1: [12, 35, 80],    c2: [22, 60, 95],    c3: [15, 25, 65] }, // Afternoon: Royal Blue, Slate, Sapphire
  { time: 18, c1: [65, 20, 75],    c2: [85, 25, 38],    c3: [95, 45, 15] }, // Dusk: Deep Violet, Crimson, Rust
  { time: 22, c1: [20, 10, 50],    c2: [28, 15, 65],    c3: [35, 10, 45] }, // Night: Midnight Purple, Deep Indigo
  { time: 24, c1: [25, 12, 55],    c2: [12, 28, 58],    c3: [35, 10, 48] }  // Loop
];

function lerp(c1, c2, factor) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * factor),
    Math.round(c1[1] + (c2[1] - c1[1]) * factor),
    Math.round(c1[2] + (c2[2] - c1[2]) * factor),
  ];
}

function getColorsForTime() {
  const d = new Date();
  const currentHourFloat = d.getHours() + d.getMinutes() / 60;
  
  let startIdx = 0;
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (currentHourFloat >= STOPS[i].time && currentHourFloat < STOPS[i + 1].time) {
      startIdx = i; break;
    }
  }
  const s1 = STOPS[startIdx];
  const s2 = STOPS[startIdx + 1];
  const range = s2.time - s1.time;
  const factor = (currentHourFloat - s1.time) / range;

  return {
    c1: lerp(s1.c1, s2.c1, factor),
    c2: lerp(s1.c2, s2.c2, factor),
    c3: lerp(s1.c3, s2.c3, factor)
  };
}

export function useTimeColors() {
  const [colors, setColors] = useState(getColorsForTime);

  useEffect(() => {
    // Re-check every minute
    const t = setInterval(() => {
      setColors(getColorsForTime());
    }, 60000);
    return () => clearInterval(t);
  }, []);

  return colors;
}

export function MeshBackground() {
  const { c1, c2, c3 } = useTimeColors();
  
  useEffect(() => {
    const originalBodyBg = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = '#030408'; 
    document.body.style.backgroundColor = 'transparent'; 
    return () => { 
      document.documentElement.style.backgroundColor = ''; 
      document.body.style.backgroundColor = originalBodyBg;
    };
  }, []);

  return (
    <div className="mesh-bg-container">
      <div className="mesh-orb orb-1" style={{ background: `rgb(${c1.join(',')})` }} />
      <div className="mesh-orb orb-2" style={{ background: `rgb(${c2.join(',')})` }} />
      <div className="mesh-orb orb-3" style={{ background: `rgb(${c3.join(',')})` }} />
    </div>
  );
}

export function SkyBackground() {
  const { c1, c2, c3 } = useTimeColors();
  
  useEffect(() => {
    const originalBodyBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'transparent';
    return () => { document.body.style.backgroundColor = originalBodyBg; };
  }, []);

  return (
    <div 
      className="sky-bg-container"
      style={{
        background: `radial-gradient(circle at 30% 0%, rgb(${c1.join(',')}) 0%, rgb(${c2.join(',')}) 50%, rgb(${c3.join(',')}) 100%)`
      }}
    />
  );
}

export function ClassicBackground() {
  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours();
      let theme = 'theme-night';
      let bg = '#07080a';
      if (hour >= 5 && hour < 9) { theme = 'theme-morning'; bg = '#120e15'; }
      else if (hour >= 9 && hour < 16) { theme = 'theme-day'; bg = '#0a0f16'; }
      else if (hour >= 16 && hour < 19) { theme = 'theme-evening'; bg = '#140a16'; }
      document.body.className = theme;
      document.documentElement.style.backgroundColor = bg;
    };
    updateTheme();
    const t = setInterval(updateTheme, 60 * 60 * 1000);
    return () => {
      clearInterval(t);
      document.body.className = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  return null;
}
