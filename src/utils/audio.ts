import { ALARM_SOUNDS } from '../constants';

export const playAlarmSound = (id: string, loop: boolean = false): { stop: () => void } => {
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
            playNote(880, 'sine', 0.5, 0.5, nextNoteTime);
            playNote(1108.73, 'sine', 0.5, 0.5, nextNoteTime + 0.2);
            nextNoteTime += 1.0;
            break;
          case 'birds':
            playNote(2000 + Math.random() * 1000, 'sine', 0.1, 0.2, nextNoteTime);
            playNote(2500 + Math.random() * 1000, 'sine', 0.1, 0.2, nextNoteTime + 0.1);
            nextNoteTime += 0.5 + Math.random() * 0.5;
            break;
          case 'digital':
            playNote(1000, 'square', 0.1, 0.3, nextNoteTime);
            playNote(1000, 'square', 0.1, 0.3, nextNoteTime + 0.2);
            nextNoteTime += 1.0;
            break;
          case 'gentle':
            playNote(440, 'sine', 0.5, 0.3, nextNoteTime);
            nextNoteTime += 2.0;
            break;
          case 'high_sound':
            playNote(1200, 'square', 0.2, 0.9, nextNoteTime);
            playNote(1600, 'square', 0.2, 0.9, nextNoteTime + 0.2);
            playNote(2000, 'square', 0.2, 0.9, nextNoteTime + 0.4);
            nextNoteTime += 0.6;
            break;
          case 'marimba':
            playNote(523.25, 'sine', 0.2, 0.5, nextNoteTime);
            playNote(659.25, 'sine', 0.2, 0.5, nextNoteTime + 0.2);
            playNote(783.99, 'sine', 0.2, 0.5, nextNoteTime + 0.4);
            nextNoteTime += 1.5;
            break;
          case 'ocean':
            // White noise approximation
            const bufferSize = audioCtx.sampleRate * 2;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
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
            break;
          case 'piano':
            playNote(261.63, 'sine', 0.5, 0.4, nextNoteTime); // C4
            playNote(329.63, 'sine', 0.5, 0.4, nextNoteTime + 0.2); // E4
            playNote(392.00, 'sine', 0.5, 0.4, nextNoteTime + 0.4); // G4
            nextNoteTime += 2.0;
            break;
          case 'rooster':
            playNote(800, 'sawtooth', 0.2, 0.3, nextNoteTime);
            playNote(1000, 'sawtooth', 0.2, 0.3, nextNoteTime + 0.2);
            playNote(1200, 'sawtooth', 0.4, 0.3, nextNoteTime + 0.4);
            nextNoteTime += 2.0;
            break;
          case 'synth':
            playNote(440, 'square', 0.2, 0.2, nextNoteTime);
            playNote(880, 'square', 0.2, 0.2, nextNoteTime + 0.2);
            playNote(440, 'square', 0.2, 0.2, nextNoteTime + 0.4);
            nextNoteTime += 1.0;
            break;
          case 'default':
          default:
            playNote(800, 'sine', 0.2, 0.4, nextNoteTime);
            playNote(800, 'sine', 0.2, 0.4, nextNoteTime + 0.2);
            playNote(800, 'sine', 0.2, 0.4, nextNoteTime + 0.4);
            playNote(800, 'sine', 0.2, 0.4, nextNoteTime + 0.6);
            nextNoteTime += 1.5;
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
