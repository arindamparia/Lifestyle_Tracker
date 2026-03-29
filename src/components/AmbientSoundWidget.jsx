import React, { useState, useRef, useEffect, useCallback } from 'react';

const AUDIO_URLS = {
  // ── New tracks (priority) ──────────────────────────────────────────────────
  healing: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774780549/HealingSound.mp3',
  windMandir: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774779620/Winds_Through_the_Old_Mandir_Flute___Sitar_in_Timeless_Tranquility_MP3_160K_llh2me.mp3',
  shivaDeep: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774779618/SHIVA___Beautiful_Indian_Background_Music___Deep___Mystical_Meditation_Music___Ambient_Hindu_Music_MP3_160K_sgrn1q.mp3',
  meditation: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774774806/Temple_Rhythms_Tabla__Flute___Sitar_Tranquility___1_Hour_Indian_Meditation_Music_MP3_160K_aspm1l.mp3',
  krishnaFlute: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774779598/Flute_of_Peace___Shri_Krishna_Relaxing_Instrumental_MP3_160K_ugj3b0.mp3',
  // ── Original tracks ────────────────────────────────────────────────────────
  rain: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/rain_fe6smc.mp3',
  rain2: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/rain2_uycmn6.mp3',
  ocean: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378668/ocean_gzek2u.mp3',
  forest: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/forest_l804pd.mp3',
  forest2: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774382236/forest2_xg9jbw.mp3',
  forest3: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/forest3_xlypzq.mp3',
  river: 'https://res.cloudinary.com/dnju7wfma/video/upload/v1774382577/river_ffhhlr.mp3',
};

const TRACKS = [
  // ── New tracks first (highest priority) ───────────────────────────────────
  { key: 'healing', emoji: '✨', label: 'Healing Sounds' },
  { key: 'windMandir', emoji: '🛕', label: 'Winds of the Mandir' },
  { key: 'shivaDeep', emoji: '🔱', label: 'Shiva — Deep Mystical' },
  { key: 'meditation', emoji: '🪘', label: 'Indian Meditation' },
  { key: 'krishnaFlute', emoji: '🪈', label: 'Krishna Flute of Peace' },
  // ── Original tracks ────────────────────────────────────────────────────────
  { key: 'rain', emoji: '🌧️', label: 'Calming Rain' },
  { key: 'rain2', emoji: '🌦️', label: 'Light Rain' },
  { key: 'ocean', emoji: '🌊', label: 'Ocean Waves' },
  { key: 'forest', emoji: '🌲', label: 'Forest Ambience' },
  { key: 'forest2', emoji: '🍃', label: 'Wind & Crickets' },
  { key: 'forest3', emoji: '🐦', label: 'Nature Birds' },
  { key: 'river', emoji: '🛶', label: 'River & Birds' },
];

const CROSSFADE_SEC = 4.0;
const SNAPS = [0, 0.5, 1, 1.5, 2, 2.5, 3];

// Non-linear slider mapping: lower half = 0–1×, upper half = 1–3×
const sliderToVol = (s) => s <= 0.5 ? s * 2 : 1 + (s - 0.5) * 4;
const volToSlider = (v) => v <= 1 ? v / 2 : 0.5 + (v - 1) / 4;
const fmtVol = (vol) => vol % 1 === 0 ? `${vol.toFixed(0)}×` : `${vol.toFixed(1)}×`;

const getSavedSlider = () => {
  const v = localStorage.getItem('lst_ambient_vol');
  return v !== null ? volToSlider(parseFloat(v)) : 0.5;
};

// ── Live Bars — shown in toggle button when playing (Guide §2) ───────────────
function LiveBars() {
  return (
    <span className="live-bars" aria-label="Playing">
      <span /><span /><span /><span />
    </span>
  );
}

export default function AmbientSoundWidget() {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [loadingTrack, setLoadingTrack] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volSlider, setVolSlider] = useState(getSavedSlider);

  // ── Audio refs (no re-render needed) ─────────────────────────────────────
  const audioA = useRef(null);
  const audioB = useRef(null);
  const audioCtx = useRef(null);
  const gainA = useRef(null);
  const gainB = useRef(null);
  const activeDeck = useRef('A');
  const isFading = useRef(false);
  const fadeRaf = useRef(null);

  // Ref to hold the toggleTrack function to avoid circular dependencies
  const toggleTrackRef = useRef(null);

  // DOM ref for the volume input — used to update --fill CSS var (Guide §3)
  const volInputRef = useRef(null);

  // Mirror state into refs so event-listener closures always read current values
  const isPlayingRef = useRef(false);
  const currentTrackRef = useRef(null);
  const volSliderRef = useRef(volSlider);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { volSliderRef.current = volSlider; }, [volSlider]);

  // ── Init --fill on mount so the track is filled from the saved position ───
  useEffect(() => {
    volInputRef.current?.style.setProperty('--fill', `${Math.round(volSlider * 100)}%`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close panel on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('#ambient-widget')) setPanelOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Resume AudioContext when tab regains visibility/focus ─────────────────
  useEffect(() => {
    const resume = () => {
      if (audioCtx.current && audioCtx.current.state === 'suspended') {
        audioCtx.current.resume().catch(() => { });
      }
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
    };
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(fadeRaf.current);
      if (audioA.current) { audioA.current.pause(); audioA.current.src = ''; }
      if (audioB.current) { audioB.current.pause(); audioB.current.src = ''; }
      if (audioCtx.current && audioCtx.current.state !== 'closed') {
        audioCtx.current.close().catch(() => { });
      }
      // Clear media session
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
        ['play', 'pause', 'nexttrack', 'previoustrack', 'seekforward', 'seekbackward', 'seekto']
          .forEach(a => { try { navigator.mediaSession.setActionHandler(a, null); } catch { } });
      }
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const gainFor = (audio) => audio === audioA.current ? gainA.current : gainB.current;

  // ── Media Session — takes over OS notification controls ───────────────────
  const attachMediaSession = useCallback((trackKey) => {
    if (!('mediaSession' in navigator)) return;
    const track = TRACKS.find(t => t.key === trackKey);

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track?.label || 'Ambient Sound',
      artist: 'LifeStyle Tracker',
      album: 'Calm Background Sounds',
    });

    navigator.mediaSession.playbackState = 'playing';

    // ── 1. THE "LIVE STREAM" TRICK TO HIDE THE SEEK BAR ──
    if ('setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Infinity,
          playbackRate: 1,
          position: 0
        });
      } catch (e) {
        console.warn('setPositionState not supported', e);
      }
    }

    // ── 2. THE EVENT SWALLOWER TO DISABLE SEEKING ──
    ['seekforward', 'seekbackward', 'seekto'].forEach(action => {
      try {
        navigator.mediaSession.setActionHandler(action, () => {
          // Intentionally empty. Do absolutely nothing if they try to seek.
        });
      } catch { }
    });

    // Play / Pause
    navigator.mediaSession.setActionHandler('pause', () => {
      audioA.current?.pause();
      audioB.current?.pause();
      cancelAnimationFrame(fadeRaf.current);
      setIsPlaying(false);
      navigator.mediaSession.playbackState = 'paused';
    });

    navigator.mediaSession.setActionHandler('play', () => {
      const key = currentTrackRef.current;
      if (key) {
        const deck = activeDeck.current === 'A' ? audioA.current : audioB.current;
        deck?.play().then(() => {
          setIsPlaying(true);
          navigator.mediaSession.playbackState = 'playing';
        }).catch(() => { });
      }
    });

    // Next / Previous cycles through ambient tracks using the ref
    const idx = TRACKS.findIndex(t => t.key === trackKey);
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (toggleTrackRef.current) {
        toggleTrackRef.current(TRACKS[(idx + 1) % TRACKS.length].key);
      }
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (toggleTrackRef.current) {
        toggleTrackRef.current(TRACKS[(idx - 1 + TRACKS.length) % TRACKS.length].key);
      }
    });
  }, []); // Removed toggleTrack from dependencies

  const doCrossfade = useCallback((fadeOutAudio, fadeInAudio) => {
    isFading.current = true;
    fadeInAudio.currentTime = 0;

    const fadeOutGain = gainFor(fadeOutAudio);
    const fadeInGain = gainFor(fadeInAudio);
    fadeInGain.gain.value = 0;

    fadeInAudio.play().catch(() => { });

    const duration = CROSSFADE_SEC * 1000;
    const fadeStart = performance.now();
    cancelAnimationFrame(fadeRaf.current);

    const tick = (now) => {
      const ratio = Math.min((now - fadeStart) / duration, 1);
      const targetVol = sliderToVol(volSliderRef.current);
      fadeOutGain.gain.value = Math.max(0, targetVol * (1 - ratio));
      fadeInGain.gain.value = targetVol * ratio;

      if (ratio < 1) {
        fadeRaf.current = requestAnimationFrame(tick);
      } else {
        fadeOutAudio.pause();
        fadeOutAudio.currentTime = 0;
        fadeOutGain.gain.value = 0;
        fadeInGain.gain.value = targetVol;
        activeDeck.current = activeDeck.current === 'A' ? 'B' : 'A';
        isFading.current = false;
      }
    };
    fadeRaf.current = requestAnimationFrame(tick);
  }, []); // only refs → stable

  const lazyInitDecks = useCallback(() => {
    if (audioA.current) return; // already initialised

    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();

    const makeAudio = () => {
      const a = new Audio();
      a.preload = 'none';
      a.loop = false;
      a.crossOrigin = 'anonymous';
      a.volume = 1; // GainNode controls actual level
      return a;
    };

    audioA.current = makeAudio();
    audioB.current = makeAudio();

    gainA.current = audioCtx.current.createGain();
    gainB.current = audioCtx.current.createGain();

    const wire = (audio, gain) => {
      const src = audioCtx.current.createMediaElementSource(audio);
      src.connect(gain);
      gain.connect(audioCtx.current.destination);
    };
    wire(audioA.current, gainA.current);
    wire(audioB.current, gainB.current);

    // Error / buffering indicators
    const attach = (deck) => {
      deck.addEventListener('error', () => {
        if (deck.src) { setIsPlaying(false); setLoadingTrack(null); }
      });
      deck.addEventListener('waiting', () => {
        if (currentTrackRef.current) setLoadingTrack(currentTrackRef.current);
      });
      deck.addEventListener('canplay', () => setLoadingTrack(null));
    };
    attach(audioA.current);
    attach(audioB.current);

    // Crossfade monitor — trigger when nearing end of track
    const monitor = (deck, next) => {
      deck.addEventListener('timeupdate', () => {
        if (!isPlayingRef.current || isFading.current) return;
        if (deck.duration && deck.currentTime >= deck.duration - CROSSFADE_SEC) {
          doCrossfade(deck, next);
        }
      });
    };
    monitor(audioA.current, audioB.current);
    monitor(audioB.current, audioA.current);
  }, [doCrossfade]);

  // ── Toggle track (play / pause) ───────────────────────────────────────────
  const toggleTrack = useCallback((track) => {
    // Tap same playing track → pause
    if (currentTrackRef.current === track && isPlayingRef.current) {
      cancelAnimationFrame(fadeRaf.current);
      isFading.current = false;
      audioA.current?.pause();
      audioB.current?.pause();
      setIsPlaying(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      return;
    }

    lazyInitDecks();

    // Resume AudioContext if suspended (browser autoplay policy)
    if (audioCtx.current?.state === 'suspended') audioCtx.current.resume();

    cancelAnimationFrame(fadeRaf.current);
    isFading.current = false;
    activeDeck.current = 'A';

    // Load new src only when track changes
    if (currentTrackRef.current !== track) {
      audioA.current.src = AUDIO_URLS[track];
      audioB.current.src = AUDIO_URLS[track];
    }

    setCurrentTrack(track);
    setLoadingTrack(track);

    const vol = sliderToVol(volSliderRef.current);
    gainA.current.gain.value = vol;
    audioA.current.currentTime = 0;
    audioB.current.pause();
    audioB.current.currentTime = 0;
    gainB.current.gain.value = 0;

    audioA.current.play()
      .then(() => {
        setIsPlaying(true);
        attachMediaSession(track);
      })
      .catch((err) => {
        setLoadingTrack(null);
        console.warn('Ambient play blocked:', err);
      });
  }, [lazyInitDecks, attachMediaSession]);

  // Update the ref whenever toggleTrack changes
  useEffect(() => {
    toggleTrackRef.current = toggleTrack;
  }, [toggleTrack]);

  // ── Volume (Guide §3 — also updates --fill on the DOM input) ─────────────
  const handleVolChange = useCallback((e) => {
    let slider = parseFloat(e.target.value);
    let vol = sliderToVol(slider);

    // Magnetic snap to round step
    for (const s of SNAPS) {
      if (Math.abs(vol - s) < 0.08) { vol = s; slider = volToSlider(s); break; }
    }

    // Update the filled-track gradient immediately (no re-render needed)
    e.target.style.setProperty('--fill', `${Math.round(slider * 100)}%`);

    localStorage.setItem('lst_ambient_vol', vol);
    setVolSlider(slider);

    if (!isFading.current) {
      const target = activeDeck.current === 'A' ? gainA.current : gainB.current;
      if (target) target.gain.value = vol;
    }
  }, []);

  // ── Mute ──────────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioA.current) audioA.current.muted = next;
      if (audioB.current) audioB.current.muted = next;
      return next;
    });
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const vol = sliderToVol(volSlider);
  const isBoosted = vol > 1;

  return (
    <div id="ambient-widget">
      <div id="ambient-panel" className={panelOpen ? 'open' : ''}>

        {/* Track grid — Guide §1: icon + 4 equalizer bars per button */}
        <div className="ambient-tracks-scroll">
          <div className="ambient-tracks">
            {TRACKS.map((t) => {
              const playing = currentTrack === t.key && isPlaying;
              const loading = loadingTrack === t.key;
              return (
                <button
                  key={t.key}
                  className={[
                    'ambient-btn',
                    playing ? 'playing' : '',
                    loading ? 'loading' : '',
                  ].filter(Boolean).join(' ')}
                  title={t.label}
                  onClick={() => toggleTrack(t.key)}
                >
                  {/* Icon nudges up when playing via CSS transform */}
                  <span className="abt__icon">{t.emoji}</span>
                  {/* Bars always in DOM — opacity + animation driven by .playing CSS */}
                  <span className="abt__bars" aria-hidden="true">
                    <span /><span /><span /><span />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Volume — Guide §3: premium filled-track slider */}
        <div className="ambient-volume">
          <span className="ambient-mute-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? '🔇' : '🔉'}
          </span>
          <div className="ambient-vol-wrap">
            <input
              ref={volInputRef}
              type="range"
              className={`vol-slider${isBoosted ? ' boosted' : ''}`}
              min="0" max="1" step="0.002"
              value={volSlider}
              onChange={handleVolChange}
            />
            <span className={`ambient-vol-label${isBoosted ? ' boosted' : ''}`}>
              {fmtVol(vol)}
            </span>
          </div>
        </div>

      </div>

      {/* Toggle button — Guide §2: live bars replace 🎵 when playing */}
      <button
        id="ambient-toggle"
        className={isPlaying ? 'active-glow' : ''}
        onClick={(e) => { e.stopPropagation(); setPanelOpen((v) => !v); }}
        title="Calm Sound"
      >
        <span className="ambient-toggle-icon">
          {isPlaying ? <LiveBars /> : '🎵'}
        </span>
        <span className="ambient-toggle-text">Calm Sound</span>
      </button>
    </div>
  );
}