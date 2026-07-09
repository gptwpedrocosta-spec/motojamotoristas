// Audio synthesis utility using Web Audio API (no external file dependencies)
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// 1. Incoming Ride Notification (Ringing alert)
let incomingInterval: NodeJS.Timeout | null = null;
export function startIncomingSound() {
  stopIncomingSound(); // Clear any existing

  const playBeep = () => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch (A5)
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);

      // Play double beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        gain2.gain.setValueAtTime(0.2, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 150);
    } catch (e) {
      console.warn("Audio Context not allowed yet:", e);
    }
  };

  playBeep();
  incomingInterval = setInterval(playBeep, 1500);
}

export function stopIncomingSound() {
  if (incomingInterval) {
    clearInterval(incomingInterval);
    incomingInterval = null;
  }
}

// 2. Completed / Earnings Success Sound (Cha-Ching)
export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    
    // First high chime
    const playChime = (pitch: number, timeOffset: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(pitch, ctx.currentTime + timeOffset);
      
      gain.gain.setValueAtTime(volume, ctx.currentTime + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + timeOffset);
      osc.stop(ctx.currentTime + timeOffset + 0.4);
    };

    playChime(1500, 0, 0.15);
    playChime(1800, 0.08, 0.15);
    playChime(2200, 0.16, 0.15);
  } catch (e) {
    console.warn("Audio failure:", e);
  }
}

// 3. Status Online / Offline Beep
export function playStatusSound(isOnline: boolean) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    if (isOnline) {
      // Ascending tone
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    } else {
      // Descending tone
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    }

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.warn("Audio failure:", e);
  }
}

// 4. GPS Navigation update beep
export function playNavSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.warn("Audio failure:", e);
  }
}
