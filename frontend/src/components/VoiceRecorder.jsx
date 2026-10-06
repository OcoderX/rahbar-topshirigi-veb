import { useState, useRef, useEffect } from 'react';

/**
 * VoiceRecorder — browser-based audio recorder using MediaRecorder API.
 * Encodes to WebM/Ogg/WAV and returns base64 data URL.
 */
export default function VoiceRecorder({ audioUrl, onAudioChange, onRecordStart }) {
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          onAudioChange(base64, blob);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(100);
      setRecording(true);
      setTimer(0);
      if (onRecordStart) onRecordStart();

      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Mikrofondan foydalanishga ruxsat berilmadi: " + (err.message || ''));
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function togglePlay() {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  }

  return (
    <div className="voice-recorder-inline">
      {!recording && !audioUrl && (
        <button
          type="button"
          className="btn-mic-trigger"
          onClick={startRecording}
          title="Ovozli xabar yozish"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <span className="mic-btn-text">Ovoz yozish</span>
        </button>
      )}

      {recording && (
        <div className="voice-recording-bar">
          <span className="rec-pulse-dot" />
          <span className="rec-time">{formatTime(timer)}</span>
          <span className="rec-wave-anim">
            <span /><span /><span /><span />
          </span>
          <button
            type="button"
            className="btn btn-sm btn-danger rec-stop-btn"
            onClick={stopRecording}
          >
            ⏹ To‘xtatish
          </button>
        </div>
      )}

      {!recording && audioUrl && (
        <div className="voice-preview-pill">
          <audio
            ref={audioPlayerRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="voice-play-btn"
            onClick={togglePlay}
            title={isPlaying ? "To‘xtatish" : "Tinglash"}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div className="voice-track-info">
            <span className="voice-label">🎙️ Ovozli xabar yozildi</span>
          </div>
          <button
            type="button"
            className="voice-remove-btn"
            onClick={() => onAudioChange(null, null)}
            title="Ovozni o‘chirish"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
