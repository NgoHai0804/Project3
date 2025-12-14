// soundManager.js - Quản lý và phát hiệu ứng âm thanh

class SoundManager {
  constructor() {
    this.sounds = {};
    this.muted = localStorage.getItem('soundEnabled') === 'false';
    this.volume = 0.5;
    this.loadSounds();
  }

  loadSounds() {
    // Tạo audio objects cho các âm thanh
    // Có thể thay thế bằng file thật sau
    this.sounds = {
      move: this.createSound('move'),
      win: this.createSound('win'),
      lose: this.createSound('lose'),
      draw: this.createSound('draw'),
      message: this.createSound('message'),
      click: this.createSound('click'),
    };
  }

  createSound(type) {
    // Tạo audio object - có thể load từ file sau
    const audio = new Audio();
    // Tạm thời dùng Web Audio API để tạo âm thanh đơn giản
    // Hoặc có thể load từ file: audio.src = `/assets/sounds/${type}.mp3`;
    return audio;
  }

  playSound(type) {
    if (this.muted) return;

    try {
      // Tạo âm thanh đơn giản bằng Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Tùy chỉnh âm thanh theo loại
      switch (type) {
        case 'move':
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.1 * this.volume, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
        case 'win':
          oscillator.frequency.value = 523.25; // C note
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.2 * this.volume, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'lose':
          oscillator.frequency.value = 200;
          oscillator.type = 'sawtooth';
          gainNode.gain.setValueAtTime(0.2 * this.volume, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'draw':
          oscillator.frequency.value = 400;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.15 * this.volume, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case 'message':
          oscillator.frequency.value = 600;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.1 * this.volume, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15);
          break;
        case 'click':
          oscillator.frequency.value = 1000;
          oscillator.type = 'square';
          gainNode.gain.setValueAtTime(0.05 * this.volume, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.05);
          break;
        default:
          oscillator.frequency.value = 500;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.1 * this.volume, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
      }
    } catch (error) {
      console.warn('Sound playback error:', error);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('soundEnabled', (!this.muted).toString());
    return this.muted;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  isMuted() {
    return this.muted;
  }
}

export const soundManager = new SoundManager();

// Hàm tiện ích
export const playSound = (type) => {
  soundManager.playSound(type);
};

export const toggleMute = () => {
  return soundManager.toggleMute();
};

export const setVolume = (volume) => {
  soundManager.setVolume(volume);
};

export default soundManager;
