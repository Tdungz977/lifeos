// Web Audio API Ambient Sound Synthesizer (Works 100% offline without external assets)
class AmbientAudioService {
  private ctx: AudioContext | null = null
  private noiseNode: AudioNode | null = null
  private gainNode: GainNode | null = null
  private filterNode: BiquadFilterNode | null = null
  private currentType: 'rain' | 'cafe' | 'waves' | null = null
  private currentVolume: number = 0.65 // 0.0 to 1.0
  private isAudioPlaying: boolean = false

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  private createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not ready')
    const bufferSize = this.ctx.sampleRate * 2 // 2 seconds looping buffer
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const output = buffer.getChannelData(0)

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      // Pink noise algorithm (Paul Kellet's filtered method)
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
    return buffer
  }

  public play(type: 'rain' | 'cafe' | 'waves', volume: number = 65) {
    try {
      this.initContext()
      if (!this.ctx) return

      this.stop()

      this.currentType = type
      this.currentVolume = Math.max(0, Math.min(100, volume)) / 100

      // Create looping buffer source
      const buffer = this.createNoiseBuffer()
      const source = this.ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true

      // Create filter
      const filter = this.ctx.createBiquadFilter()
      if (type === 'rain') {
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(600, this.ctx.currentTime)
        filter.Q.setValueAtTime(1.5, this.ctx.currentTime)
      } else if (type === 'cafe') {
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime)
        filter.Q.setValueAtTime(0.8, this.ctx.currentTime)
      } else {
        // 'waves' / white noise
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(1600, this.ctx.currentTime)
        filter.Q.setValueAtTime(0.5, this.ctx.currentTime)
      }

      // Create gain node
      const gain = this.ctx.createGain()
      gain.gain.setValueAtTime(this.currentVolume * 0.4, this.ctx.currentTime)

      // Connect graph: source -> filter -> gain -> destination
      source.connect(filter)
      filter.connect(gain)
      gain.connect(this.ctx.destination)

      source.start(0)

      this.noiseNode = source
      this.filterNode = filter
      this.gainNode = gain
      this.isAudioPlaying = true
    } catch (err) {
      console.warn('AudioContext playback error:', err)
    }
  }

  public stop() {
    if (this.noiseNode) {
      try {
        (this.noiseNode as AudioBufferSourceNode).stop()
        this.noiseNode.disconnect()
      } catch {
        // ignore
      }
      this.noiseNode = null
    }
    this.isAudioPlaying = false
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(100, volume)) / 100
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.currentVolume * 0.4, this.ctx.currentTime)
    }
  }

  public isPlaying(): boolean {
    return this.isAudioPlaying
  }

  public getType(): 'rain' | 'cafe' | 'waves' | null {
    return this.currentType
  }
}

export const ambientAudioService = new AmbientAudioService()
