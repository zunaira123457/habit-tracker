'use strict';
// Voice answers via the browser's Web Speech API. No audio is stored; only the transcript.
// Supported in Chrome, Edge and Safari (Chrome sends audio to Google for recognition). Not in Firefox.

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const speechSupported = () => !!SR;

/**
 * Start recording. Recognition sessions end on their own after silence, so this restarts them
 * until stop() is called, keeping every finalized phrase.
 * @returns {{ stop: () => void, elapsed: () => number }}
 */
export function startRecording({ onText, onStop, onError }) {
  const finals = [];
  let interim = '', active = true, rec = null, stoppedAt = null, finished = false, sessionStart = 0;
  const startedAt = Date.now();
  const text = () => [...finals, interim].join(' ').replace(/\s+/g, ' ').trim();

  function spawn() {
    sessionStart = Date.now();
    rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    rec.onresult = e => {
      interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals.push(r[0].transcript.trim()); else interim += r[0].transcript;
      }
      onText(text());
    };
    rec.onerror = e => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      active = false;
      onError(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'Microphone access is blocked. Allow it in your browser settings, or type your answer.'
        : e.error === 'network' ? 'Speech recognition needs an internet connection.' : `Speech recognition stopped (${e.error}).`);
    };
    const me = rec;
    rec.onend = () => {
      if (me !== rec) return; // a stale session from before a restart
      if (!active) return finish();
      // Restart, pausing briefly if the session ended right away (avoids a tight loop)
      setTimeout(() => { if (!active) return finish(); try { spawn(); } catch { active = false; finish(); } }, Date.now() - sessionStart < 500 ? 400 : 0);
    };
    rec.start();
  }
  function finish() {
    if (finished) return;
    finished = true;
    interim = '';
    onStop({ text: text(), durationSec: ((stoppedAt || Date.now()) - startedAt) / 1000 });
  }
  try { spawn(); } catch (err) { active = false; onError('Couldn\'t start speech recognition.'); }

  return {
    stop() { if (!active) return; active = false; stoppedAt = Date.now(); try { rec.stop(); } catch { finish(); } },
    elapsed: () => ((stoppedAt || Date.now()) - startedAt) / 1000,
  };
}
