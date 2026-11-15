import { useEffect, useRef, useState } from 'react';
import { Mic, Radio, Square } from 'lucide-react';

const SILENCE_TIMEOUT_MS = 45_000;

const resampleTo16Khz = (input, sampleRate) => {
  if (sampleRate === 16000) return input;
  const ratio = sampleRate / 16000;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let index = 0; index < output.length; index += 1) {
    const sourceIndex = index * ratio;
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.min(leftIndex + 1, input.length - 1);
    const fraction = sourceIndex - leftIndex;
    output[index] = input[leftIndex] * (1 - fraction) + input[rightIndex] * fraction;
  }
  return output;
};

const encodePcm16 = (samples) => {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
};

const appendTranscript = (setTranscript, role, text) => {
  if (!text) return;
  setTranscript((current) => {
    const last = current[current.length - 1];
    if (last?.role === role) {
      const mergedText = text.startsWith(last.text) ? text : `${last.text}${text}`;
      return [...current.slice(0, -1), { ...last, text: mergedText }];
    }
    return [...current, { id: `${Date.now()}-${Math.random()}`, role, text }].slice(-12);
  });
};

const decodeAndPlayAudio = (context, data, playheadRef) => {
  if (!context || context.state === 'closed' || !data) return;
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const view = new DataView(bytes.buffer);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  if (!sampleCount) return;
  const audioBuffer = context.createBuffer(1, sampleCount, 24000);
  const channel = audioBuffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    channel[index] = view.getInt16(index * 2, true) / 32768;
  }

  const source = context.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(context.destination);
  const startAt = Math.max(context.currentTime, playheadRef.current);
  source.start(startAt);
  playheadRef.current = startAt + audioBuffer.duration;
};

export default function VoiceAssistantCard({
  persona,
  name,
  assistantId,
  description,
  tools,
  configured = false,
  disabled = false,
  onActiveChange = () => {},
}) {
  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState([]);
  const sessionRef = useRef(null);
  const streamRef = useRef(null);
  const inputContextRef = useRef(null);
  const outputContextRef = useRef(null);
  const sourceRef = useRef(null);
  const processorRef = useRef(null);
  const silentGainRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const playheadRef = useRef(0);

  const stopAudio = () => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    sessionRef.current?.close();
    sessionRef.current = null;
    if (processorRef.current) processorRef.current.onaudioprocess = null;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    silentGainRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;
    silentGainRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    for (const context of [inputContextRef.current, outputContextRef.current]) {
      if (context && context.state !== 'closed') {
        void context.close().catch((closeError) => console.error('Unable to close voice audio context:', closeError));
      }
    }
    inputContextRef.current = null;
    outputContextRef.current = null;
  };

  const endSession = (message = 'Session ended.') => {
    stopAudio();
    onActiveChange(null);
    setStatus('ended');
    setStatusMessage(message);
  };

  const resetSilenceTimer = () => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      endSession('Disconnected after 45 seconds of silence.');
    }, SILENCE_TIMEOUT_MS);
  };

  const handleToolCalls = async (session, calls) => {
    const functionResponses = [];
    for (const call of calls) {
      try {
        const response = await fetch('/api/vex-node/realtime-tool', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona, name: call.name, args: call.args || {} }),
        });
        const data = await response.json();
        functionResponses.push({
          id: call.id,
          name: call.name,
          response: response.ok ? { result: data.result } : { error: data.error || 'Tool request failed.' },
        });
      } catch {
        functionResponses.push({
          id: call.id,
          name: call.name,
          response: { error: 'Tool request could not reach the protected VEX-NODE API.' },
        });
      }
    }

    if (sessionRef.current === session && functionResponses.length) {
      try {
        session.sendToolResponse({ functionResponses });
      } catch (toolError) {
        setError(toolError.message || 'Unable to return the tool result to Gemini Live.');
        endSession('Session ended because a tool response failed.');
      }
    }
  };

  const handleMessage = (session, message) => {
    resetSilenceTimer();
    const content = message.serverContent;
    appendTranscript(setTranscript, 'You', content?.inputTranscription?.text);
    appendTranscript(setTranscript, name, content?.outputTranscription?.text);

    for (const part of content?.modelTurn?.parts || []) {
      if (part.inlineData?.data) {
        decodeAndPlayAudio(outputContextRef.current, part.inlineData.data, playheadRef);
      }
    }

    const calls = message.toolCall?.functionCalls || [];
    if (calls.length) void handleToolCalls(session, calls);
  };

  const startSession = async () => {
    if (!configured || disabled) return;
    setStatus('starting');
    onActiveChange(persona);
    setStatusMessage('');
    setError('');
    setTranscript([]);

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
        throw new Error('This browser does not support microphone audio sessions.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const inputContext = new window.AudioContext({ sampleRate: 16000 });
      const outputContext = new window.AudioContext({ sampleRate: 24000 });
      inputContextRef.current = inputContext;
      outputContextRef.current = outputContext;
      await Promise.all([inputContext.resume(), outputContext.resume()]);

      const tokenResponse = await fetch('/api/vex-node/realtime-token', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokenData.error || 'Unable to authorize the voice session.');

      const { GoogleGenAI } = await import('@google/genai');
      const client = new GoogleGenAI({
        apiKey: tokenData.token,
        httpOptions: { apiVersion: 'v1beta' },
      });
      let liveSession;
      liveSession = await client.live.connect({
        model: tokenData.model,
        config: tokenData.config,
        callbacks: {
          onopen: () => setStatus('listening'),
          onmessage: (message) => handleMessage(liveSession, message),
          onerror: (event) => {
            setError(event.message || 'Gemini Live connection failed.');
            endSession('Session ended because the voice connection failed.');
          },
          onclose: () => {
            if (sessionRef.current === liveSession) endSession('Voice session closed.');
          },
        },
      });
      sessionRef.current = liveSession;
      setStatus('listening');
      setStatusMessage('Microphone connected. Say something to begin.');

      const source = inputContext.createMediaStreamSource(stream);
      const processor = inputContext.createScriptProcessor(2048, 1, 1);
      const silentGain = inputContext.createGain();
      silentGain.gain.value = 0;
      sourceRef.current = source;
      processorRef.current = processor;
      silentGainRef.current = silentGain;
      processor.onaudioprocess = (event) => {
        if (sessionRef.current !== liveSession) return;
        const input = event.inputBuffer.getChannelData(0);
        let energy = 0;
        for (let index = 0; index < input.length; index += 1) energy += input[index] * input[index];
        if (Math.sqrt(energy / input.length) > 0.015) resetSilenceTimer();
        const pcmData = encodePcm16(resampleTo16Khz(input, inputContext.sampleRate));
        try {
          liveSession.sendRealtimeInput({
            audio: { data: pcmData, mimeType: 'audio/pcm;rate=16000' },
          });
        } catch (audioError) {
          setError(audioError.message || 'Unable to send microphone audio.');
          endSession('Session ended because microphone streaming failed.');
        }
      };
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(inputContext.destination);
      playheadRef.current = outputContext.currentTime;
      resetSilenceTimer();
    } catch (sessionError) {
      stopAudio();
      onActiveChange(null);
      setStatus('error');
      setError(sessionError.message || 'Unable to start a voice session.');
    }
  };

  useEffect(() => () => stopAudio(), []);

  const isActive = status === 'starting' || status === 'listening';

  return (
    <article className="relative overflow-hidden border border-red-500/20 bg-[#111014]/95 p-4 sm:p-5">
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-[#fb394f]" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[8px] font-black tracking-[0.18em] text-gray-500">{assistantId}</div>
          <h3 className="mt-1 text-sm font-semibold text-gray-100">{name}</h3>
        </div>
        <span className={`text-[8px] font-black uppercase tracking-widest ${status === 'listening' ? 'text-emerald-400' : status === 'error' ? 'text-red-300' : 'text-amber-400'}`}>
          {status === 'listening' ? 'Live' : status === 'starting' ? 'Connecting' : status === 'error' ? 'Unavailable' : configured ? 'Ready' : 'Setup required'}
        </span>
      </div>
      <p className="mb-4 min-h-10 text-[10px] leading-5 text-gray-400">{description}</p>
      <div className="border border-white/10 bg-black/30 p-3">
        <div className="mb-2 flex items-center justify-between gap-2 text-[7px] font-black uppercase tracking-widest text-gray-500">
          <span>{status === 'listening' ? 'Session live' : status === 'starting' ? 'Starting secure session' : 'Realtime voice session'}</span>
          <span>{status === 'listening' ? 'Personal mic · 45s silence disconnect' : 'Microphone off'}</span>
        </div>
        <div className={`h-px ${status === 'listening' ? 'bg-emerald-400' : 'bg-red-500/50'}`} />
        <div aria-live="polite" className="mt-3 max-h-32 min-h-12 space-y-2 overflow-y-auto text-[9px] leading-4">
          {transcript.length ? transcript.map((entry) => (
            <p key={entry.id} className={entry.role === 'You' ? 'text-gray-300' : 'border-l border-red-500/50 pl-2 text-red-200'}>
              <span className="mr-2 text-[7px] font-black uppercase tracking-widest text-gray-600">{entry.role}</span>{entry.text}
            </p>
          )) : <p className="text-gray-600">{statusMessage || (configured ? 'No session is active. Microphone access starts only after you connect.' : 'Add GEMINI_API_KEY to the Vercel server environment to enable sessions.')}</p>}
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-[9px] leading-4 text-red-300">{error}</p>}
      {statusMessage && status !== 'idle' && transcript.length > 0 && <p role="status" className="mt-2 text-[8px] text-gray-500">{statusMessage}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {isActive ? (
          <button type="button" onClick={() => endSession()} className="inline-flex items-center gap-2 border border-red-500/30 bg-red-500/5 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-red-200 hover:bg-red-500/10">
            <Square size={11} /> End session
          </button>
        ) : (
          <button type="button" onClick={startSession} disabled={!configured || disabled} className="inline-flex items-center gap-2 border border-red-500/30 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40">
            <Mic size={12} /> Start voice session
          </button>
        )}
        <span className="inline-flex items-center gap-1 text-right text-[7px] uppercase tracking-widest text-gray-600"><Radio size={10} /> {tools}</span>
      </div>
    </article>
  );
}
