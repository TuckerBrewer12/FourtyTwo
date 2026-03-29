// sounds.ts — Web Audio API synthesized game sounds

let _ctx: AudioContext | null = null

const ctx = () => {
  if (!_ctx) _ctx = new AudioContext()
  return _ctx
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.3, delay = 0) {
  const c = ctx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(vol, c.currentTime + delay)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(c.currentTime + delay)
  osc.stop(c.currentTime + delay + duration + 0.05)
}

function noise(duration: number, vol = 0.15) {
  const c = ctx()
  const bufSize = c.sampleRate * duration
  const buf = c.createBuffer(1, bufSize, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const gain = c.createGain()
  gain.gain.setValueAtTime(vol, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  const filter = c.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 800
  src.connect(filter)
  filter.connect(gain)
  gain.connect(c.destination)
  src.start()
  src.stop(c.currentTime + duration + 0.05)
}

const Sounds = {
  tilePlay: () => {
    noise(0.06, 0.2)
    tone(180, 0.08, 'sine', 0.25)
  },

  trickWin: () => {
    tone(523, 0.12)
    tone(659, 0.18, 'sine', 0.3, 0.1)
  },

  bidPlace: () => {
    tone(440, 0.05, 'sine', 0.2)
  },

  trumpSet: () => {
    tone(400, 0.15, 'sine', 0.2)
    tone(600, 0.15, 'sine', 0.2, 0.12)
    tone(800, 0.25, 'sine', 0.25, 0.24)
  },

  handMade: () => {
    tone(523, 0.12, 'sine', 0.3)
    tone(659, 0.12, 'sine', 0.3, 0.1)
    tone(784, 0.2, 'sine', 0.35, 0.2)
  },

  handSet: () => {
    tone(330, 0.2, 'triangle', 0.25)
    tone(262, 0.35, 'triangle', 0.2, 0.18)
  },

  gameWin: () => {
    tone(523, 0.1, 'sine', 0.3)     // C5
    tone(659, 0.1, 'sine', 0.3, 0.1) // E5
    tone(784, 0.1, 'sine', 0.3, 0.2) // G5
    tone(1047, 0.3, 'sine', 0.35, 0.3) // C6 — final held 0.3s
  },

  gameLose: () => {
    tone(262, 0.4, 'triangle', 0.2)
    tone(311, 0.4, 'triangle', 0.15)
  },

  yourTurn: () => {
    tone(784, 0.06, 'sine', 0.2)
    tone(1047, 0.1, 'sine', 0.25, 0.05)
  },

  countdown: () => {
    tone(880, 0.04, 'sine', 0.15)
  },

  error: () => {
    tone(200, 0.12, 'square', 0.15)
  },
}

export function playSound(sound: keyof typeof Sounds) {
  try {
    const raw = localStorage.getItem('fortytwo_settings')
    if (raw) {
      const settings = JSON.parse(raw)
      if (settings.soundEnabled === false) return
    }
    Sounds[sound]()
  } catch { /* ignore */ }
}
