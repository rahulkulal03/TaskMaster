import { ALARM_SOUNDS } from '../constants';

export const playAlarmSound = (id: string, loop: boolean = false): { stop: () => void } => {
  if (id === 'custom') {
    const customRingtone = localStorage.getItem('custom_ringtone');
    if (customRingtone) {
      try {
        const audio = new Audio(customRingtone);
        audio.loop = loop;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.error('Audio playback failed', e));
        }
        return {
          stop: () => {
            audio.pause();
            audio.currentTime = 0;
          }
        };
      } catch (e) {
        console.error('Audio playback failed', e);
        return { stop: () => {} };
      }
    }
  }

  if (id.startsWith('custom_music')) {
    const sound = ALARM_SOUNDS.find(s => s.id === id);
    if (sound && sound.url) {
      try {
        const audio = new Audio(sound.url);
        audio.loop = loop;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.error('Audio playback failed', e));
        }
        return {
          stop: () => {
            audio.pause();
            audio.currentTime = 0;
          }
        };
      } catch (e) {
        console.error('Audio playback failed', e);
        return { stop: () => {} };
      }
    }
  }

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return { stop: () => {} };
    const audioCtx = new AudioContext();
    let isPlaying = true;
    let nextNoteTime = audioCtx.currentTime;

    const playNote = (freq: number, type: OscillatorType, duration: number, vol: number, startTime: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const scheduleNotes = () => {
      if (!isPlaying) return;
      
      while (nextNoteTime < audioCtx.currentTime + 0.1) {
        switch (id) {
          case 'bells':
            for (let i = 0; i < 6; i++) {
              playNote(880, 'sine', 0.5, 0.5, nextNoteTime);
              playNote(1108.73, 'sine', 0.5, 0.5, nextNoteTime + 0.2);
              nextNoteTime += 1.0;
            }
            break;
          case 'birds':
            for (let i = 0; i < 15; i++) {
              playNote(2000 + Math.random() * 1000, 'sine', 0.1, 0.2, nextNoteTime);
              playNote(2500 + Math.random() * 1000, 'sine', 0.1, 0.2, nextNoteTime + 0.1);
              nextNoteTime += 0.5 + Math.random() * 0.5;
            }
            break;
          case 'digital':
            for (let i = 0; i < 6; i++) {
              playNote(1000, 'square', 0.1, 0.3, nextNoteTime);
              playNote(1000, 'square', 0.1, 0.3, nextNoteTime + 0.2);
              nextNoteTime += 1.0;
            }
            break;
          case 'gentle':
            for (let i = 0; i < 3; i++) {
              playNote(440, 'sine', 0.5, 0.3, nextNoteTime);
              nextNoteTime += 2.0;
            }
            break;
          case 'high_freq_1':
            for (let i = 0; i < 15; i++) {
              playNote(1000, 'sine', 0.2, 0.9, nextNoteTime);
              nextNoteTime += 0.4;
            }
            break;
          case 'high_freq_2':
            for (let i = 0; i < 15; i++) {
              playNote(2000, 'sine', 0.2, 0.9, nextNoteTime);
              nextNoteTime += 0.4;
            }
            break;
          case 'high_freq_3':
            for (let i = 0; i < 15; i++) {
              playNote(3000, 'sine', 0.2, 0.9, nextNoteTime);
              nextNoteTime += 0.4;
            }
            break;
          case 'high_freq_4':
            for (let i = 0; i < 15; i++) {
              playNote(2500, 'square', 0.2, 0.9, nextNoteTime);
              playNote(3500, 'square', 0.2, 0.9, nextNoteTime + 0.2);
              nextNoteTime += 0.4;
            }
            break;
          case 'high_freq_5':
            for (let i = 0; i < 15; i++) {
              playNote(3500, 'sine', 0.2, 0.9, nextNoteTime);
              nextNoteTime += 0.4;
            }
            break;
          case 'high_freq_6':
            for (let i = 0; i < 15; i++) {
              playNote(4000, 'sine', 0.2, 0.9, nextNoteTime);
              nextNoteTime += 0.4;
            }
            break;
          case 'high_freq_7':
            for (let i = 0; i < 15; i++) {
              playNote(5000, 'sine', 0.2, 0.9, nextNoteTime);
              nextNoteTime += 0.4;
            }
            break;
          case 'high_freq_8':
            // Sweep from 2kHz to 5kHz
            for (let i = 0; i < 10; i++) {
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(2000, nextNoteTime);
              osc.frequency.linearRampToValueAtTime(5000, nextNoteTime + 0.5);
              gain.gain.setValueAtTime(0.8, nextNoteTime);
              gain.gain.exponentialRampToValueAtTime(0.01, nextNoteTime + 0.5);
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.start(nextNoteTime);
              osc.stop(nextNoteTime + 0.5);
              nextNoteTime += 0.6;
            }
            break;
          case 'high_freq_9':
            for (let i = 0; i < 12; i++) {
              playNote(4000, 'square', 0.05, 0.9, nextNoteTime);
              playNote(4000, 'square', 0.05, 0.9, nextNoteTime + 0.1);
              playNote(4000, 'square', 0.05, 0.9, nextNoteTime + 0.2);
              nextNoteTime += 0.5;
            }
            break;
          case 'high_freq_10':
            // Siren
            for (let i = 0; i < 9; i++) {
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = 'square';
              osc.frequency.setValueAtTime(1500, nextNoteTime);
              osc.frequency.linearRampToValueAtTime(3000, nextNoteTime + 0.3);
              osc.frequency.linearRampToValueAtTime(1500, nextNoteTime + 0.6);
              gain.gain.setValueAtTime(0.8, nextNoteTime);
              gain.gain.exponentialRampToValueAtTime(0.01, nextNoteTime + 0.6);
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.start(nextNoteTime);
              osc.stop(nextNoteTime + 0.6);
              nextNoteTime += 0.7;
            }
            break;
          case 'loud_beep_1':
            for (let i = 0; i < 10; i++) {
              playNote(1000, 'square', 0.25, 1.0, nextNoteTime);
              nextNoteTime += 0.5;
            }
            break;
          case 'loud_beep_2':
            for (let i = 0; i < 7; i++) {
              playNote(1200, 'square', 0.15, 1.0, nextNoteTime);
              playNote(1200, 'square', 0.15, 1.0, nextNoteTime + 0.2);
              nextNoteTime += 0.7;
            }
            break;
          case 'loud_beep_3':
            for (let i = 0; i < 20; i++) {
              playNote(1500, 'square', 0.1, 1.0, nextNoteTime);
              nextNoteTime += 0.25;
            }
            break;
          case 'loud_beep_4':
            for (let i = 0; i < 7; i++) {
              playNote(3000, 'sawtooth', 0.4, 1.0, nextNoteTime);
              nextNoteTime += 0.7;
            }
            break;
          case 'loud_beep_5':
            for (let i = 0; i < 5; i++) {
              playNote(800, 'square', 0.6, 1.0, nextNoteTime);
              nextNoteTime += 1.0;
            }
            break;
          case 'heavy_loud_1':
            // Thunder Strike
            for (let i = 0; i < 6; i++) {
              playNote(100, 'sawtooth', 0.3, 1.0, nextNoteTime);
              playNote(150, 'square', 0.2, 1.0, nextNoteTime + 0.1);
              playNote(200, 'sawtooth', 0.4, 1.0, nextNoteTime + 0.2);
              nextNoteTime += 1.0;
            }
            break;
          case 'heavy_loud_2':
            // Reactor Warning
            for (let i = 0; i < 8; i++) {
              playNote(400, 'sawtooth', 0.4, 1.0, nextNoteTime);
              playNote(415, 'sawtooth', 0.4, 1.0, nextNoteTime);
              playNote(430, 'sawtooth', 0.4, 1.0, nextNoteTime);
              nextNoteTime += 0.8;
            }
            break;
          case 'heavy_loud_3':
            // Air Raid
            for (let i = 0; i < 2; i++) {
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(300, nextNoteTime);
              osc.frequency.linearRampToValueAtTime(800, nextNoteTime + 1.5);
              osc.frequency.linearRampToValueAtTime(300, nextNoteTime + 3);
              gain.gain.setValueAtTime(0.01, nextNoteTime);
              gain.gain.linearRampToValueAtTime(1.0, nextNoteTime + 0.5);
              gain.gain.setValueAtTime(1.0, nextNoteTime + 2.5);
              gain.gain.linearRampToValueAtTime(0.01, nextNoteTime + 3);
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.start(nextNoteTime);
              osc.stop(nextNoteTime + 3);
              nextNoteTime += 3.5;
            }
            break;
          case 'heavy_loud_4':
            // Heavy Machine Gun
            for (let i = 0; i < 30; i++) {
              playNote(800, 'square', 0.05, 1.0, nextNoteTime);
              playNote(600, 'sawtooth', 0.05, 1.0, nextNoteTime + 0.02);
              nextNoteTime += 0.15;
            }
            break;
          case 'heavy_loud_5':
            // Tornado Siren
            for (let i = 0; i < 4; i++) {
              const osc1 = audioCtx.createOscillator();
              const osc2 = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc1.type = 'square';
              osc2.type = 'square';
              osc1.frequency.setValueAtTime(600, nextNoteTime);
              osc1.frequency.linearRampToValueAtTime(800, nextNoteTime + 0.5);
              osc1.frequency.linearRampToValueAtTime(600, nextNoteTime + 1);
              osc2.frequency.setValueAtTime(610, nextNoteTime);
              osc2.frequency.linearRampToValueAtTime(815, nextNoteTime + 0.5);
              osc2.frequency.linearRampToValueAtTime(610, nextNoteTime + 1);
              gain.gain.setValueAtTime(0.8, nextNoteTime);
              osc1.connect(gain);
              osc2.connect(gain);
              gain.connect(audioCtx.destination);
              osc1.start(nextNoteTime);
              osc2.start(nextNoteTime);
              osc1.stop(nextNoteTime + 1);
              osc2.stop(nextNoteTime + 1);
              nextNoteTime += 1.2;
            }
            break;
          case 'marimba':
            for (let i = 0; i < 4; i++) {
              playNote(523.25, 'sine', 0.2, 0.5, nextNoteTime);
              playNote(659.25, 'sine', 0.2, 0.5, nextNoteTime + 0.2);
              playNote(783.99, 'sine', 0.2, 0.5, nextNoteTime + 0.4);
              nextNoteTime += 1.5;
            }
            break;
          case 'ocean':
            // White noise approximation
            for (let i = 0; i < 2; i++) {
              const bufferSize = audioCtx.sampleRate * 2;
              const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
              const data = buffer.getChannelData(0);
              for (let j = 0; j < bufferSize; j++) {
                data[j] = Math.random() * 2 - 1;
              }
              const noise = audioCtx.createBufferSource();
              noise.buffer = buffer;
              const noiseFilter = audioCtx.createBiquadFilter();
              noiseFilter.type = 'lowpass';
              noiseFilter.frequency.value = 400;
              const noiseGain = audioCtx.createGain();
              noiseGain.gain.setValueAtTime(0.01, nextNoteTime);
              noiseGain.gain.linearRampToValueAtTime(0.2, nextNoteTime + 1);
              noiseGain.gain.linearRampToValueAtTime(0.01, nextNoteTime + 2);
              noise.connect(noiseFilter);
              noiseFilter.connect(noiseGain);
              noiseGain.connect(audioCtx.destination);
              noise.start(nextNoteTime);
              nextNoteTime += 2.5;
            }
            break;
          case 'piano':
            for (let i = 0; i < 3; i++) {
              playNote(261.63, 'sine', 0.5, 0.4, nextNoteTime); // C4
              playNote(329.63, 'sine', 0.5, 0.4, nextNoteTime + 0.2); // E4
              playNote(392.00, 'sine', 0.5, 0.4, nextNoteTime + 0.4); // G4
              nextNoteTime += 2.0;
            }
            break;
          case 'rooster':
            for (let i = 0; i < 3; i++) {
              playNote(800, 'sawtooth', 0.2, 0.3, nextNoteTime);
              playNote(1000, 'sawtooth', 0.2, 0.3, nextNoteTime + 0.2);
              playNote(1200, 'sawtooth', 0.4, 0.3, nextNoteTime + 0.4);
              nextNoteTime += 2.0;
            }
            break;
          case 'synth':
            for (let i = 0; i < 5; i++) {
              playNote(440, 'square', 0.2, 0.2, nextNoteTime);
              playNote(880, 'square', 0.2, 0.2, nextNoteTime + 0.2);
              playNote(440, 'square', 0.2, 0.2, nextNoteTime + 0.4);
              nextNoteTime += 1.0;
            }
            break;
          case 'default':
          default:
            for (let i = 0; i < 4; i++) {
              playNote(800, 'sine', 0.2, 0.4, nextNoteTime);
              playNote(800, 'sine', 0.2, 0.4, nextNoteTime + 0.2);
              playNote(800, 'sine', 0.2, 0.4, nextNoteTime + 0.4);
              playNote(800, 'sine', 0.2, 0.4, nextNoteTime + 0.6);
              nextNoteTime += 1.5;
            }
            break;
        }
      }
      
      if (loop && isPlaying) {
        setTimeout(scheduleNotes, 50);
      }
    };

    scheduleNotes();

    return {
      stop: () => {
        isPlaying = false;
        try {
          audioCtx.close();
        } catch (e) {
          console.error('Failed to close audio context', e);
        }
      }
    };
  } catch (e) {
    console.error('Audio playback failed', e);
    return { stop: () => {} };
  }
};
