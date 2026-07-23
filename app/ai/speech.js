// napkiln speech capture — thin wrapper over the Web Speech API that keeps a
// rolling final transcript plus the current interim fragment, auto-restarting
// recognition until stopped. Exposed as window.NapkilnAI.SpeechCapture.
(function () {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  class SpeechCapture {
    static available() { return !!Recognition; }

    // onUpdate(finalTranscript, interimFragment) fires on every result;
    // onState('denied'|'error'|'stopped') fires on lifecycle changes.
    start(onUpdate, onState) {
      if (!Recognition || this._active) return false;
      this._active = true;
      this._paused = false;
      this._final = '';
      const rec = this._rec = new Recognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = navigator.language || 'en-US';
      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) this._final += r[0].transcript + ' ';
          else interim += r[0].transcript;
        }
        if (!this._paused) onUpdate(this._final, interim);
      };
      rec.onerror = (ev) => {
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          this._active = false;
          if (onState) onState('denied');
        }
        // 'no-speech'/'aborted'/'network' fall through to onend, which restarts
      };
      rec.onend = () => {
        if (this._active && !this._paused) {
          try { rec.start(); } catch (e) { /* already started */ }
        } else if (!this._active && onState) onState('stopped');
      };
      try { rec.start(); } catch (e) { this._active = false; return false; }
      return true;
    }

    pause() { this._paused = true; if (this._rec) try { this._rec.stop(); } catch (e) {} }
    resume() { if (!this._active) return; this._paused = false; if (this._rec) try { this._rec.start(); } catch (e) {} }
    stop() {
      this._active = false; this._paused = false;
      if (this._rec) { try { this._rec.stop(); } catch (e) {} this._rec = null; }
    }
    get transcript() { return this._final || ''; }
  }

  window.NapkilnAI = Object.assign(window.NapkilnAI || {}, { SpeechCapture });
})();
