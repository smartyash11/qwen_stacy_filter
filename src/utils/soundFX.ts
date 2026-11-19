// Web Audio API Synthesized Sound Effects (No external audio files needed)

class SoundFXManager {
  private ctx: AudioContext | null = null

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        this.ctx = new AudioContextClass()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  // Futuristic multiverse portal whoosh on blink / filter switch
  public playWhoosh() {
    try {
      this.initCtx()
      if (!this.ctx) return

      const ctx = this.ctx
      const t = ctx.currentTime

      // 1. Noise whoosh buffer
      const bufferSize = ctx.sampleRate * 0.45
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }

      const whiteNoise = ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(200, t)
      filter.frequency.exponentialRampToValueAtTime(1800, t + 0.18)
      filter.frequency.exponentialRampToValueAtTime(300, t + 0.42)
      filter.Q.setValueAtTime(3.5, t)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.01, t)
      gain.gain.linearRampToValueAtTime(0.35, t + 0.12)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45)

      whiteNoise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      whiteNoise.start(t)
      whiteNoise.stop(t + 0.46)

      // 2. Sci-fi Sine chime chord
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(520, t)
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.2)
      oscGain.gain.setValueAtTime(0.12, t)
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)

      osc.connect(oscGain)
      oscGain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.36)
    } catch (e) {
      console.warn('Audio playback not permitted yet', e)
    }
  }

  // Camera shutter snap sound
  public playShutter() {
    try {
      this.initCtx()
      if (!this.ctx) return
      const ctx = this.ctx
      const t = ctx.currentTime

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(120, t)
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.08)

      gain.gain.setValueAtTime(0.4, t)
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.1)
    } catch (e) {
      console.warn(e)
    }
  }
}

export const soundFX = new SoundFXManager()

