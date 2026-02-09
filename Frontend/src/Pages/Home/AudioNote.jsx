import { useEffect, useMemo, useRef, useState } from "react";
import {
  MdClose,
  MdFiberManualRecord,
  MdPause,
  MdPlayArrow,
  MdStop,
  MdUpload,
} from "react-icons/md";
import PropTypes from "prop-types";
import axiosInstance from "../../Utils/axiosInstance";
import FullScreenLoader from "../../Components/Loading/FullScreenLoader";

function getSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SR ? new SR() : null;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToQuillHtml(text) {
  const safe = escapeHtml(text).replace(/\n/g, "<br/>");
  return `<p>${safe}</p>`;
}

function formatSeconds(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(Math.floor(s % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

function encodeWav({ audioBuffer }) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bitsPerSample = 16;

  const interleaved = new Float32Array(numFrames * numChannels);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < numFrames; i++) {
      interleaved[i * numChannels + ch] = channelData[i];
    }
  }

  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = interleaved.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

async function convertAudioFileToWav(file) {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  const wavBuffer = encodeWav({ audioBuffer: decoded });
  await audioContext.close();
  return new File([wavBuffer], "audio.wav", { type: "audio/wav" });
}

function AudioNote({ onClose, onUseDraft }) {
  const [activeTab, setActiveTab] = useState("record"); // "record" | "upload"
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [micStatus, setMicStatus] = useState("idle");
  const [micPermission, setMicPermission] = useState("unknown");
  const [liveDictationEnabled, setLiveDictationEnabled] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribingUpload, setIsTranscribingUpload] = useState(false);
  const [uploadStage, setUploadStage] = useState("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [aiDraft, setAiDraft] = useState(null);

  const isActiveRef = useRef(true);
  const statusRef = useRef(status);
  const listenTimeoutRef = useRef(null);
  const transcriptRef = useRef({ final: "", interim: "" });
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const recognitionRef = useRef(null);
  const isRecognitionRunningRef = useRef(false);

  const speechSupported = useMemo(() => !!getSpeechRecognition(), []);
  const language = useMemo(() => navigator.language || "en-US", []);
  const languageFallback = useMemo(() => "en-US", []);
  const isSecure = useMemo(() => !!window.isSecureContext, []);

  const stopRecognition = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (!isRecognitionRunningRef.current) return;
    try {
      recognition.stop();
    } catch {
      return;
    }
  };

  const startRecognition = (lang) => {
    setError("");
    if (!speechSupported) {
      setError("Live transcription is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort?.();
      } catch {
        return;
      }
    }

    const recognition = getSpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = lang || language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isRecognitionRunningRef.current = true;
      if (isActiveRef.current) setMicStatus("listening");
    };

    recognition.onaudiostart = () => {
      if (isActiveRef.current) setMicStatus("audio-start");
    };
    recognition.onsoundstart = () => {
      if (isActiveRef.current) setMicStatus("sound-start");
    };
    recognition.onspeechstart = () => {
      if (isActiveRef.current) setMicStatus("speech-start");
    };
    recognition.onspeechend = () => {
      if (isActiveRef.current && statusRef.current === "recording") setMicStatus("listening");
    };

    recognition.onerror = (e) => {
      const code = String(e?.error || "").trim();
      if (!isActiveRef.current) return;

      if (code === "language-not-supported" && (lang || language) !== languageFallback) {
        setMicStatus("starting");
        startRecognition(languageFallback);
        return;
      }

      const message = code ? `Transcription error: ${code}` : "Transcription error";
      setError(message);
      setMicStatus("error");
    };

    recognition.onend = () => {
      isRecognitionRunningRef.current = false;
      if (isActiveRef.current) setInterimTranscript("");
      if (isActiveRef.current && statusRef.current === "recording" && liveDictationEnabled) {
        setTimeout(() => {
          if (!isActiveRef.current) return;
          if (statusRef.current !== "recording") return;
          startRecognition(lang || language);
        }, 200);
      }
    };

    recognition.onresult = (event) => {
      let newFinal = "";
      let newInterim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript || "";
        if (result.isFinal) newFinal += text;
        else newInterim += text;
      }
      if (!isActiveRef.current) return;
      if (newFinal) setFinalTranscript((prev) => `${prev} ${newFinal}`.trim());
      setInterimTranscript(newInterim.trim());
    };

    try {
      setMicStatus("starting");
      recognition.start();
    } catch (e) {
      if (!isActiveRef.current) return;
      setMicStatus("error");
      const msg = String(e?.message || "").trim();
      setError(msg ? `Transcription error: ${msg}` : "Transcription error");
    }
  };

  const stopRecording = () => {
    stopRecognition();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        return;
      }
    }

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setStatus("stopped");
    setMicStatus("idle");
  };

  const startRecording = async () => {
    setError("");
    setAiDraft(null);
    setFinalTranscript("");
    setInterimTranscript("");
    setRecordingSeconds(0);
    setUploadProgress(null);

    setMicStatus("requesting-permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      if (isActiveRef.current) setMicPermission("granted");
    } catch {
      if (!isActiveRef.current) return;
      setMicPermission("denied");
      setMicStatus("error");
      setError("Microphone permission denied or unavailable.");
      return;
    }

    setStatus("recording");
    const preferredTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    const selectedMimeType =
      preferredTypes.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";

    try {
      const recorder = new MediaRecorder(streamRef.current, selectedMimeType ? { mimeType: selectedMimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        const file = new File([blob], "recording.webm", { type: mime });

        try {
          await transcribeUploadedFile(file);
        } catch {
          return;
        }
      };

      recorder.start();
    } catch {
      setMicStatus("error");
      setError("Recording is not supported in this browser.");
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    if (liveDictationEnabled && speechSupported) {
      setTimeout(() => {
        if (!isActiveRef.current) return;
        if (statusRef.current !== "recording") return;
        startRecognition(language);
      }, 180);
    } else {
      setMicStatus("off");
    }

    if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    listenTimeoutRef.current = setTimeout(() => {
      if (!isActiveRef.current) return;
      if (statusRef.current !== "recording") return;
      if (!transcriptRef.current.final && !transcriptRef.current.interim) {
        if (liveDictationEnabled) setMicStatus("no-speech");
      }
    }, 1800);
  };

  const pauseRecording = () => {
    stopRecognition();
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      try {
        recorder.pause();
      } catch {
        return;
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus("paused");
    setMicStatus("idle");
  };

  const resumeRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "paused") {
      try {
        recorder.resume();
      } catch {
        return;
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    setStatus("recording");
    if (liveDictationEnabled && speechSupported) startRecognition(language);
  };

  const generateWithAI = async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text) {
      setError("Transcript is empty.");
      return;
    }
    setError("");
    setAiDraft(null);
    setIsGenerating(true);
    try {
      const res = await axiosInstance.post("/ai/note_draft", {
        transcript: text,
      });
      const draft = res?.data?.draft;
      if (!draft) {
        setError("AI draft not available.");
        return;
      }
      const normalizedDraft = {
        title: draft.title || "",
        content: draft.content || textToQuillHtml(text),
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        categoryId: draft.categoryId || "",
      };
      setAiDraft(normalizedDraft);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        "AI generation failed. Check GEMINI_API_KEY on backend.";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const transcribeUploadedFile = async (file) => {
    if (!file) return;
    setError("");
    setAiDraft(null);
    setIsTranscribingUpload(true);
    setUploadStage("preparing");
    setUploadProgress(null);
    setStatus("stopped");
    setFinalTranscript("");
    setInterimTranscript("");

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    try {
      const supported = new Set([
        "audio/wav",
        "audio/x-wav",
        "audio/mp3",
        "audio/mpeg",
        "audio/aiff",
        "audio/x-aiff",
        "audio/aac",
        "audio/ogg",
        "audio/flac",
      ]);

      let uploadFile = file;
      const mime = String(file.type || "").toLowerCase();
      if (mime && !supported.has(mime)) {
        try {
          setUploadStage("converting");
          uploadFile = await convertAudioFileToWav(file);
        } catch {
          setError(
            "This audio format cannot be converted in the browser. Please upload WAV or MP3."
          );
          setUploadStage("idle");
          return;
        }
      }

      const formData = new FormData();
      formData.append("audio", uploadFile);
      formData.append("language", language);

      setUploadStage("transcribing");
      const res = await axiosInstance.post("/ai/transcribe_audio", formData, {
        onUploadProgress: (evt) => {
          if (!evt?.total) return;
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setUploadProgress(Number.isFinite(pct) ? pct : null);
        },
      });
      const transcript = String(res?.data?.transcript || "").trim();
      if (!transcript) {
        setError("No transcript returned for this audio.");
        setUploadStage("idle");
        return;
      }
      setFinalTranscript(transcript);
      setUploadStage("idle");
      await generateWithAI(transcript);
    } catch (e) {
      const msg = e?.response?.data?.message;
      const fallback = e?.response
        ? "Audio transcription failed."
        : "Backend is not responding (server may be down).";
      setError(msg);
      if (!msg) setError(fallback);
      setUploadStage("idle");
    } finally {
      setIsTranscribingUpload(false);
    }
  };

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    transcriptRef.current = { final: finalTranscript, interim: interimTranscript };
  }, [finalTranscript, interimTranscript]);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
      stopRecognition();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          return;
        }
      }
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!navigator?.permissions?.query) return;
    let permRef = null;
    navigator.permissions
      .query({ name: "microphone" })
      .then((perm) => {
        permRef = perm;
        if (!isActiveRef.current) return;
        setMicPermission(String(perm.state || "unknown"));
        perm.onchange = () => {
          if (!isActiveRef.current) return;
          setMicPermission(String(perm.state || "unknown"));
        };
      })
      .catch(() => {
        return;
      });
    return () => {
      if (permRef) permRef.onchange = null;
    };
  }, []);

  // Determine loading message
  const loadingMessage = useMemo(() => {
    if (isGenerating) return "Generating Note with AI...";
    if (isTranscribingUpload) {
      if (uploadStage === "converting") return "Converting Audio Format...";
      if (uploadStage === "transcribing") {
        return uploadProgress !== null
          ? `Transcribing Audio... ${uploadProgress}%`
          : "Transcribing Audio...";
      }
      return "Processing Audio...";
    }
    return "Loading...";
  }, [isGenerating, isTranscribingUpload, uploadProgress, uploadStage]);

  const showLoader = isGenerating || isTranscribingUpload;

  return (
    <div className="relative min-h-[400px] flex flex-col">
      {showLoader && <FullScreenLoader message={loadingMessage} />}
      
      <button
        className="w-10 h-10 rounded-full flex items-center justify-center absolute -top-3 -right-3 hover:bg-slate-50 transition-colors z-10"
        onClick={() => {
          stopRecognition();
          onClose();
        }}
        type="button"
      >
        <MdClose className="text-xl text-slate-400" />
      </button>

      <div className="flex flex-col gap-1 mb-6">
        <h3 className="text-xl font-bold text-slate-900">Audio Note</h3>
        <p className="text-sm text-slate-500">
          Capture audio or upload a file to generate a structured note
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl mb-6 self-start">
        <button
          type="button"
          onClick={() => {
            if (status === "recording" || status === "paused") return;
            setActiveTab("record");
          }}
          disabled={status === "recording" || status === "paused"}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "record"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          } ${status === "recording" || status === "paused" ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Record
        </button>
        <button
          type="button"
          onClick={() => {
            if (status === "recording" || status === "paused") return;
            setActiveTab("upload");
          }}
          disabled={status === "recording" || status === "paused"}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "upload"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          } ${status === "recording" || status === "paused" ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Upload
        </button>
      </div>

      <div className="flex-1">
        {activeTab === "record" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col items-center justify-center min-h-[240px]">
              
              <div className="flex items-center gap-2 mb-8">
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  status === "recording" 
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : status === "paused"
                      ? "bg-amber-50 border-amber-200 text-amber-600"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                }`}>
                  {status === "recording" 
                    ? `Recording • ${formatSeconds(recordingSeconds)}`
                    : status === "paused"
                      ? `Paused • ${formatSeconds(recordingSeconds)}`
                      : "Ready to Record"}
                </div>
              </div>

              <div className="relative mb-8">
                {status === "recording" && (
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                )}
                <button
                  type="button"
                  onClick={
                    status === "idle" || status === "stopped"
                      ? startRecording
                      : status === "recording"
                        ? stopRecording
                        : status === "paused"
                          ? resumeRecording
                          : () => {}
                  }
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 ${
                    status === "recording"
                      ? "bg-rose-600 text-white shadow-xl shadow-rose-600/30"
                      : "bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:bg-slate-800"
                  }`}
                >
                  {status === "recording" ? (
                    <MdStop className="text-4xl" />
                  ) : (
                    <MdFiberManualRecord className="text-4xl" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3 min-h-[44px]">
                {status === "recording" && (
                  <>
                    <button
                      type="button"
                      onClick={pauseRecording}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                    >
                      <MdPause className="text-lg" /> Pause
                    </button>
                  </>
                )}
                
                {status === "paused" && (
                   <>
                    <button
                      type="button"
                      onClick={resumeRecording}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      <MdPlayArrow className="text-lg" /> Resume
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium hover:bg-rose-100 transition-colors flex items-center gap-2"
                    >
                      <MdStop className="text-lg" /> Stop
                    </button>
                  </>
                )}
              </div>

              {status === "idle" || status === "stopped" ? (
                <div className="mt-8 flex items-center gap-6 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${micPermission === "granted" ? "bg-emerald-500" : "bg-slate-300"}`} />
                    Mic: {micPermission}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isSecure ? "bg-emerald-500" : "bg-amber-400"}`} />
                    Secure: {isSecure ? "yes" : "no"}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={liveDictationEnabled}
                      onChange={(e) => setLiveDictationEnabled(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary/20"
                    />
                    Live Dictation (Beta)
                  </label>
                </div>
              ) : null}

              {status === "recording" && liveDictationEnabled && (
                <div className="mt-6 w-full max-w-md text-center">
                   <div className="text-[11px] text-slate-400 mb-2">{micStatus}</div>
                   <p className="text-sm text-slate-700 font-medium leading-relaxed">
                     {finalTranscript || interimTranscript || "Listening..."}
                   </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "upload" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 flex flex-col items-center justify-center min-h-[240px] text-center hover:border-primary/30 hover:bg-slate-50 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 text-primary">
                <MdUpload className="text-3xl" />
              </div>
              <h4 className="text-base font-semibold text-slate-900 mb-1">
                Upload Audio File
              </h4>
              <p className="text-sm text-slate-500 mb-6 max-w-xs">
                Select an audio file (MP3, WAV, M4A) to transcribe and process
              </p>
              
              <label className="btn-primary cursor-pointer px-6">
                <span>Choose File</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => transcribeUploadedFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Result Section: AI Smart Note */}
      {aiDraft && !showLoader ? (
        <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in duration-500">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Smart Note
              </div>
              <div className="text-xs text-slate-500">
                Auto-generated from your audio
              </div>
            </div>
            {audioUrl ? <audio className="h-8 w-48" controls src={audioUrl} /> : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-lg font-semibold text-slate-900">
              {aiDraft.title || "Untitled"}
            </div>
            <div
              className="prose prose-sm sm:prose-base max-w-none text-slate-700 mt-3"
              dangerouslySetInnerHTML={{ __html: aiDraft.content }}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3 justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                onUseDraft({
                  ...aiDraft,
                  __openAIPrompt: true,
                  __aiPrompt: "",
                })
              }
            >
              Refine with AI
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onUseDraft(aiDraft)}
            >
              Edit Note
            </button>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}
    </div>
  );
}

export default AudioNote;

AudioNote.propTypes = {
  onClose: PropTypes.func,
  onUseDraft: PropTypes.func,
};
