import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Film, LoaderCircle, Music2, Pause, Play, Plus, Trash2, Upload, X } from 'lucide-react';

const MAX_FILE_SIZE = 1024 * 1024 * 1024;
const MAX_TOTAL_SIZE = 1024 * 1024 * 1024;
const MAX_TIMELINE_SECONDS = 20 * 60;

const formatTime = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

const seconds = (value) => Math.max(0, Number(value) || 0);
const signedNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function readDuration(file, url, kind) {
  return new Promise((resolve, reject) => {
    const media = document.createElement(kind === 'audio' ? 'audio' : 'video');
    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      if (!Number.isFinite(media.duration) || media.duration <= 0) {
        reject(new Error(`${file.name} does not have a readable duration.`));
        return;
      }
      resolve(media.duration);
    };
    media.onerror = () => {
      reject(new Error(`${file.name} could not be opened by this browser.`));
    };
    media.src = url;
  });
}

function readImageSize(file, url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(`${file.name} could not be opened as an image.`));
    image.src = url;
  });
}

export default function BrowserVideoEditor() {
  const [assets, setAssets] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetKindFilter, setAssetKindFilter] = useState('all');
  const [projectName, setProjectName] = useState('Untitled VEXON Project');
  const [renderedUrl, setRenderedUrl] = useState('');
  const [renderedFilename, setRenderedFilename] = useState('');
  const ffmpegRef = useRef(null);
  const videoRef = useRef(null);
  const assetsRef = useRef(assets);
  const fileInputRef = useRef(null);
  assetsRef.current = assets;

  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const videoAssets = assets.filter((asset) => asset.kind === 'video');
  const audioAssets = assets.filter((asset) => asset.kind === 'audio');
  const visualAssets = assets.filter((asset) => asset.kind === 'video' || asset.kind === 'image');
  const totalDuration = useMemo(
    () => Math.max(0, ...assets.map((asset) => asset.start + asset.outPoint - asset.inPoint)),
    [assets],
  );
  const timelineScale = Math.max(totalDuration, 10);
  const totalBytes = assets.reduce((sum, asset) => sum + asset.file.size, 0);
  const filteredAssets = assets.filter((asset) => (
    asset.file.name.toLowerCase().includes(assetSearch.toLowerCase()) &&
    (assetKindFilter === 'all' || asset.kind === assetKindFilter)
  ));

  useEffect(() => () => {
    assetsRef.current.forEach((asset) => URL.revokeObjectURL(asset.url));
    ffmpegRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (!renderedUrl) return undefined;
    return () => URL.revokeObjectURL(renderedUrl);
  }, [renderedUrl]);

  const updateAsset = (id, patch) => {
    setAssets((current) => current.map((asset) => {
      if (asset.id !== id) return asset;
      const next = { ...asset, ...patch };
      const maxOutPoint = next.kind === 'image' ? MAX_TIMELINE_SECONDS : next.duration;
      next.inPoint = next.kind === 'image'
        ? 0
        : Math.min(next.inPoint, Math.max(0, next.outPoint - 0.1));
      next.outPoint = Math.min(maxOutPoint, Math.max(next.inPoint + 0.1, next.outPoint));
      const clipLength = next.outPoint - next.inPoint;
      next.start = Math.min(MAX_TIMELINE_SECONDS - clipLength, Math.max(0, next.start));
      if (next.kind === 'image') {
        next.imageScale = Math.min(200, Math.max(5, Number(next.imageScale) || 35));
        next.imageX = Math.min(50, Math.max(-50, Number(next.imageX) || 0));
        next.imageY = Math.min(50, Math.max(-50, Number(next.imageY) || 0));
      }
      return next;
    }));
  };

  const handleAssetDragStart = (event, asset) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', asset.id);
    event.dataTransfer.setData('application/x-vexon-clip-offset', '0');
    setSelectedId(asset.id);
  };

  const handleClipDragStart = (event, asset) => {
    const trackBounds = event.currentTarget.parentElement.getBoundingClientRect();
    const pointerTime = ((event.clientX - trackBounds.left) / trackBounds.width) * timelineScale;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', asset.id);
    event.dataTransfer.setData(
      'application/x-vexon-clip-offset',
      String(Math.max(0, pointerTime - asset.start)),
    );
    setSelectedId(asset.id);
  };

  const handleTimelineDrop = (event, track) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    const asset = assets.find((item) => item.id === id);
    if (!asset) return;
    if ((track === 3) !== (asset.kind === 'audio')) {
      setError(asset.kind === 'audio' ? 'Audio clips can only be placed on the audio track.' : 'Video and image clips can only be placed on video tracks.');
      return;
    }

    const trackBounds = event.currentTarget.getBoundingClientRect();
    const pointerTime = ((event.clientX - trackBounds.left) / trackBounds.width) * timelineScale;
    const grabOffset = Number(event.dataTransfer.getData('application/x-vexon-clip-offset')) || 0;
    const clipLength = asset.outPoint - asset.inPoint;
    const start = Math.min(
      MAX_TIMELINE_SECONDS - clipLength,
      Math.max(0, Math.round((pointerTime - grabOffset) * 10) / 10),
    );
    setError('');
    setStatus(`Moved ${asset.file.name} to ${track === 3 ? 'the audio track' : `video track ${track}`}.`);
    updateAsset(asset.id, { start, track });
    setSelectedId(asset.id);
  };

  const addFiles = async (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setError('');
    let pendingBytes = totalBytes;

    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension);
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      if (!isVideo && !isAudio && !isImage) {
        setError(`${file.name} is not a supported video, audio, or image file.`);
        continue;
      }
      if (isImage && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && !['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
        setError(`${file.name} is not a supported PNG, JPEG, or WebP image.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE || pendingBytes + file.size > MAX_TOTAL_SIZE) {
        setError('The editor allows files up to 1 GB each and 1 GB total per project. Large files may exceed available browser memory.');
        continue;
      }
      const kind = isImage ? 'image' : isAudio ? 'audio' : 'video';
      const url = URL.createObjectURL(file);
      try {
        const imageSize = kind === 'image' ? await readImageSize(file, url) : null;
        const duration = kind === 'image' ? 5 : await readDuration(file, url, kind);
        const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
        const asset = {
          id,
          file,
          url,
          kind,
          duration,
          imageSize,
          imageScale: kind === 'image' ? 35 : 100,
          imageX: 0,
          imageY: 0,
          start: 0,
          inPoint: 0,
          outPoint: duration,
          track: kind === 'audio' ? 3 : 1,
        };
        setAssets((current) => [...current, asset]);
        setSelectedId(id);
        pendingBytes += file.size;
      } catch (readError) {
        URL.revokeObjectURL(url);
        setError(readError.message || `Unable to read ${file.name}.`);
      }
    }
  };

  const removeAsset = (asset) => {
    videoRef.current?.pause();
    URL.revokeObjectURL(asset.url);
    setAssets((current) => current.filter((item) => item.id !== asset.id));
    if (selectedId === asset.id) setSelectedId('');
    setPlaying(false);
  };

  useEffect(() => {
    const handleDeleteKey = (event) => {
      if (!['Delete', 'Backspace'].includes(event.key) || !selectedId) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return;
      const asset = assets.find((item) => item.id === selectedId);
      if (!asset) return;
      event.preventDefault();
      removeAsset(asset);
    };
    window.addEventListener('keydown', handleDeleteKey);
    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [assets, selectedId]);

  const startPreview = () => {
    const player = videoRef.current;
    if (!player || !selected || selected.kind !== 'video') return;
    player.currentTime = selected.inPoint;
    player.play().then(() => setPlaying(true)).catch(() => {
      setError('The browser could not play this source file.');
    });
  };

  const handlePreviewTime = () => {
    if (!selected || !videoRef.current) return;
    if (videoRef.current.currentTime >= selected.outPoint) {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const initializeFFmpeg = async () => {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;
    if (ffmpegRef.current) {
      ffmpegRef.current.terminate();
      ffmpegRef.current = null;
    }
    setStatus('Loading the local video engine…');
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress: current }) => {
      setProgress(Math.max(0, Math.min(100, Math.round(current * 100))));
    });
    await ffmpeg.load({
      coreURL: '/ffmpeg/ffmpeg-core.js',
      wasmURL: '/ffmpeg/ffmpeg-core.wasm',
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const exportTimeline = async () => {
    setError('');
    setStatus('');
    setProgress(0);
    setRenderedUrl('');
    setRenderedFilename('');

    if (!visualAssets.length) {
      setError('Add at least one video clip or image before exporting.');
      return;
    }
    const timelineEnd = Math.max(
      ...assets.map((asset) => asset.start + asset.outPoint - asset.inPoint),
    );
    if (!Number.isFinite(timelineEnd) || timelineEnd <= 0 || timelineEnd > MAX_TIMELINE_SECONDS) {
      setError('Timeline duration must be between 1 second and 20 minutes.');
      return;
    }

    setLoading(true);
    let activeFFmpeg = null;
    try {
      const ffmpeg = await initializeFFmpeg();
      activeFFmpeg = ffmpeg;
      const inputPaths = new Map();
      const args = [];
      for (const [index, asset] of assets.entries()) {
        const extension = asset.file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'media';
        const path = `asset-${index}.${extension}`;
        inputPaths.set(asset.id, { index, path });
        await ffmpeg.writeFile(path, new Uint8Array(await asset.file.arrayBuffer()));
        if (asset.kind === 'image') args.push('-loop', '1', '-framerate', '30');
        args.push('-i', path);
      }

      const filters = [`color=c=black:s=1280x720:r=30:d=${timelineEnd}[base]`];
      const orderedVisual = [...visualAssets].sort((a, b) => a.track - b.track || a.start - b.start);
      const videoAudioAssets = [];
      for (const [index, asset] of videoAssets.entries()) {
        const { index: inputIndex, path } = inputPaths.get(asset.id);
        const probeLogs = [];
        const captureProbeLog = ({ message }) => probeLogs.push(message);
        ffmpeg.on('log', captureProbeLog);
        let probeCode;
        try {
          probeCode = await ffmpeg.exec(['-hide_banner', '-i', path]);
        } finally {
          ffmpeg.off('log', captureProbeLog);
        }
        if (
          probeCode !== 1 ||
          !probeLogs.some((line) => line.includes('At least one output file must be specified'))
        ) {
          throw new Error(`Could not inspect audio in ${asset.file.name}.`);
        }
        if (probeLogs.some((line) => /Stream #\d+:\d+.*Audio:/i.test(line))) {
          videoAudioAssets.push({ ...asset, inputIndex });
        }
      }

      let previousVideo = 'base';
      orderedVisual.forEach((asset, index) => {
        const { index: inputIndex } = inputPaths.get(asset.id);
        const duration = asset.outPoint - asset.inPoint;
        const endAt = asset.start + duration;
        const source = `video${index}`;
        const output = index === orderedVisual.length - 1 ? 'vout' : `mix${index}`;
        const trim = asset.kind === 'image'
          ? `trim=duration=${duration},`
          : `trim=start=${asset.inPoint}:end=${asset.outPoint},`;
        const imageScale = asset.kind === 'image'
          ? Math.min(
            1,
            1280 / asset.imageSize.width,
            720 / asset.imageSize.height,
          ) * asset.imageScale / 100
          : null;
        const visualFilter = asset.kind === 'image'
          ? `scale=${Math.max(2, Math.round(asset.imageSize.width * imageScale / 2) * 2)}:` +
            `${Math.max(2, Math.round(asset.imageSize.height * imageScale / 2) * 2)},format=rgba`
          : 'scale=1280:720:force_original_aspect_ratio=decrease,' +
            'format=rgba,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black@0,format=yuva420p';
        filters.push(
          `[${inputIndex}:v]${trim}` +
          `setpts=PTS-STARTPTS+${asset.start}/TB,` +
          visualFilter +
          `[${source}]`,
        );
        const overlayPosition = asset.kind === 'image'
          ? `x=(W-w)/2+${asset.imageX * 12.8}:y=(H-h)/2+${asset.imageY * 7.2}`
          : 'x=0:y=0';
        filters.push(
          `[${previousVideo}][${source}]overlay=${overlayPosition}:eof_action=pass:shortest=0:` +
          `enable='between(t,${asset.start},${endAt})'[${output}]`,
        );
        previousVideo = output;
      });

      const orderedAudio = [
        ...audioAssets.map((asset) => ({
          ...asset,
          inputIndex: inputPaths.get(asset.id).index,
        })),
        ...videoAudioAssets,
      ].sort((a, b) => a.start - b.start);
      orderedAudio.forEach((asset, index) => {
        const { inputIndex } = asset;
        const delay = Math.round(asset.start * 1000);
        filters.push(
          `[${inputIndex}:a]atrim=start=${asset.inPoint}:end=${asset.outPoint},` +
          `asetpts=PTS-STARTPTS,adelay=${delay}:all=1[aclip${index}]`,
        );
      });
      if (orderedAudio.length > 1) {
        filters.push(
          `${orderedAudio.map((_, index) => `[aclip${index}]`).join('')}` +
          `amix=inputs=${orderedAudio.length}:duration=longest:dropout_transition=0[aout]`,
        );
      }

      args.push(
        '-filter_complex', filters.join(';'),
        '-map', '[vout]',
      );
      if (orderedAudio.length === 1) args.push('-map', '[aclip0]');
      if (orderedAudio.length > 1) args.push('-map', '[aout]');
      args.push('-t', String(timelineEnd), '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p');
      if (orderedAudio.length) args.push('-c:a', 'aac');
      else args.push('-an');
      args.push('-movflags', '+faststart', 'render.mp4');

      setStatus('Rendering on this device. Keep this tab open.');
      const exitCode = await ffmpeg.exec(args);
      if (exitCode !== 0) throw new Error('The local render failed. Check the source codecs and timeline settings.');
      const output = await ffmpeg.readFile('render.mp4');
      if (typeof output === 'string') throw new Error('The rendered video could not be read.');

      const blob = new Blob([output], { type: 'video/mp4' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const safeProjectName = projectName.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').replace(/\s+/g, '-') || 'vexon-edit';
      const filename = `${safeProjectName}.mp4`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setRenderedUrl(downloadUrl);
      setRenderedFilename(filename);
      setProgress(100);
      setStatus('Render complete. Your MP4 was downloaded.');
      for (const { path } of inputPaths.values()) await ffmpeg.deleteFile(path);
      await ffmpeg.deleteFile('render.mp4');
    } catch (renderError) {
      activeFFmpeg?.terminate();
      ffmpegRef.current = null;
      setError(renderError.message || 'The browser could not render this project.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-4 overflow-hidden border border-white/10 bg-[#111216]">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/png,image/jpeg,image/webp"
        multiple
        className="sr-only"
        onChange={addFiles}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#17191e] px-4 py-3">
        <div className="flex items-center gap-3">
          <Film size={16} className="text-[#fb394f]" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-200">VEXON POST // Media workspace</span>
          <span className="hidden border-l border-white/10 pl-3 text-[8px] uppercase tracking-widest text-gray-500 sm:inline">Local project</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-gray-300 hover:border-red-400/50 disabled:opacity-50"
          >
            <Upload size={12} /> Import media
          </button>
          <button
            type="button"
            onClick={exportTimeline}
            disabled={loading || !visualAssets.length}
            className="inline-flex items-center gap-2 bg-[#21c7a8] px-4 py-2 text-[8px] font-black uppercase tracking-widest text-[#07120f] hover:bg-[#6ce8cf] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <LoaderCircle size={12} className="animate-spin" /> : <Download size={12} />}
            {loading ? `Rendering ${progress}%` : 'Export MP4'}
          </button>
        </div>
      </div>

      <div className="border-b border-white/10 bg-[#0c0d10] px-4 py-2">
        <p className="text-[8px] leading-4 text-gray-500">
          Two composited video tracks plus audio. Add transparent PNG branding as image overlays; media stays on this device. Per-file/project cap: 1 GB.
        </p>
      </div>
      {error && <p role="alert" className="m-3 border border-red-500/30 bg-red-500/5 p-3 text-[9px] text-red-200">{error}</p>}
      {status && (
        <div role="status" className="m-3 flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-black/20 p-3 text-[9px] text-gray-300">
          <span>{status}</span>
          {renderedUrl && (
            <a href={renderedUrl} download={renderedFilename} className="inline-flex items-center gap-2 border border-emerald-500/30 px-3 py-2 font-black uppercase tracking-widest text-emerald-200 hover:bg-emerald-500/10">
              <Download size={12} /> Download again
            </a>
          )}
        </div>
      )}
      {loading && <progress className="block h-1 w-full accent-red-500" max="100" value={progress} />}

      <div className="grid min-h-[430px] lg:grid-cols-[230px_minmax(0,1fr)_250px]">
        <aside className="border-b border-white/10 bg-[#15171b] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
            <div>
              <h3 className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-200">Project media</h3>
              <p className="mt-1 text-[7px] uppercase tracking-widest text-gray-600">{assets.length} asset{assets.length === 1 ? '' : 's'}</p>
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading} aria-label="Import media" className="grid h-7 w-7 place-items-center border border-white/10 text-gray-400 hover:border-red-400/40 hover:text-white disabled:opacity-50">
              <Plus size={13} />
            </button>
          </div>
          <label className="block border-b border-white/10 p-2">
            <span className="sr-only">Search project media</span>
            <input
              value={assetSearch}
              onChange={(event) => setAssetSearch(event.target.value)}
              placeholder="Search media"
              className="w-full border border-white/10 bg-[#0b0c0e] px-2 py-2 text-[8px] text-gray-200 outline-none placeholder:text-gray-600 focus:border-red-500/40"
            />
          </label>
          <div className="grid grid-cols-3 gap-1 border-b border-white/10 p-2">
            {[
              ['all', 'All'],
              ['video', 'Video'],
              ['image', 'Images'],
              ['audio', 'Audio'],
            ].map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                aria-pressed={assetKindFilter === filter}
                onClick={() => setAssetKindFilter(filter)}
                className={`px-1 py-2 text-[7px] font-black uppercase tracking-wider ${
                  assetKindFilter === filter ? 'border-b border-red-400 text-red-200' : 'text-gray-600 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-[390px] space-y-1 overflow-y-auto p-2">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                draggable
                onClick={() => setSelectedId(asset.id)}
                onDragStart={(event) => handleAssetDragStart(event, asset)}
                className={`flex w-full items-center gap-2 border p-2 text-left transition ${
                  selectedId === asset.id ? 'border-red-500/50 bg-red-500/10' : 'border-transparent bg-black/15 hover:border-white/10'
                }`}
              >
                <span className={`grid h-10 w-12 shrink-0 place-items-center overflow-hidden ${asset.kind === 'audio' ? 'bg-sky-500/10 text-sky-300' : 'bg-violet-500/10 text-violet-300'}`}>
                  {asset.kind === 'audio'
                    ? <Music2 size={16} />
                    : asset.kind === 'image'
                      ? <img src={asset.url} alt="" className="h-full w-full object-contain" />
                      : <Film size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[8px] font-bold text-gray-200">{asset.file.name}</span>
                  <span className="mt-1 block text-[7px] uppercase tracking-wider text-gray-600">
                    {asset.kind === 'image' ? `image · ${asset.imageSize.width} × ${asset.imageSize.height}` : `${asset.kind} · ${formatTime(asset.duration)}`} · {(asset.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </span>
              </button>
            ))}
            {!filteredAssets.length && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-32 w-full flex-col items-center justify-center gap-2 border border-dashed border-white/10 px-4 text-center text-[8px] uppercase tracking-widest text-gray-600 hover:border-red-400/40 hover:text-gray-300"
              >
                <Upload size={17} /> {assets.length ? 'No matching media' : 'Import video, audio, or image'}
              </button>
            )}
          </div>
          <div className="border-t border-white/10 px-3 py-2 text-[7px] uppercase tracking-widest text-gray-600">
            {(totalBytes / 1024 / 1024).toFixed(1)} MB / 1024 MB
          </div>
        </aside>

        <div className="flex min-w-0 flex-col border-b border-white/10 bg-[#0c0d10] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h3 className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-200">Preview monitor</h3>
              <p className="mt-1 text-[7px] uppercase tracking-widest text-gray-600">Source preview · 1280 × 720</p>
            </div>
            <span className="border border-white/10 px-2 py-1 text-[7px] uppercase tracking-widest text-gray-500">Fit</span>
          </div>
          <div className="flex flex-1 flex-col justify-center p-3 sm:p-5">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden border border-white/10 bg-black shadow-[0_12px_35px_rgba(0,0,0,.4)]">
              {selected?.kind === 'video' ? (
                <video
                  ref={videoRef}
                  key={selected.id}
                  src={selected.url}
                  controls
                  playsInline
                  className="max-h-full max-w-full"
                  onTimeUpdate={handlePreviewTime}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
              ) : selected?.kind === 'image' ? (
                <img
                  src={selected.url}
                  alt={selected.file.name}
                  className="absolute max-h-full max-w-full object-contain"
                  style={{
                    left: `calc(50% + ${selected.imageX}%)`,
                    top: `calc(50% + ${selected.imageY}%)`,
                    transform: `translate(-50%, -50%) scale(${selected.imageScale / 100})`,
                  }}
                />
              ) : selected?.kind === 'audio' ? (
                <div className="w-4/5 text-center">
                  <Music2 size={28} className="mx-auto mb-4 text-sky-300" />
                  <audio key={selected.id} src={selected.url} controls className="w-full" />
                </div>
              ) : (
                <div className="text-center text-[8px] uppercase tracking-widest text-gray-700">
                  <Film size={28} className="mx-auto mb-2" />
                  Import and select a clip to preview
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between border border-white/10 bg-[#15171b] px-3 py-2">
              <button
                type="button"
                disabled={!selected || selected.kind !== 'video'}
                onClick={playing ? () => videoRef.current?.pause() : startPreview}
                aria-label={playing ? 'Pause preview' : 'Play preview'}
                className="grid h-7 w-7 place-items-center text-gray-300 hover:text-[#fb394f] disabled:opacity-30"
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <span className="text-[8px] tabular-nums text-gray-500">
                {selected ? `IN ${formatTime(selected.inPoint)} / OUT ${formatTime(selected.outPoint)}` : 'IN 0:00 / OUT 0:00'}
              </span>
              <span className="text-[7px] uppercase tracking-widest text-gray-600">Source</span>
            </div>
          </div>
        </div>

        <aside className="bg-[#15171b]">
          <div className="border-b border-white/10 px-3 py-3">
            <h3 className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-200">Project info</h3>
          </div>
          <div className="space-y-4 p-3">
            <label className="block text-[7px] uppercase tracking-widest text-gray-600">
              Project name
              <input
                value={projectName}
                maxLength={60}
                onChange={(event) => setProjectName(event.target.value)}
                className="mt-2 w-full border border-white/10 bg-[#0b0c0e] px-2 py-2 text-[8px] text-gray-200 outline-none focus:border-red-500/40"
              />
            </label>
            <dl className="divide-y divide-white/5 border-y border-white/10 text-[8px]">
              {[
                ['Resolution', '1280 × 720'],
                ['Frame rate', '30 fps'],
                ['Format', 'MP4 · H.264'],
                ['Duration', formatTime(totalDuration)],
                ['Media', `${assets.length} assets`],
                ['Project size', `${(totalBytes / 1024 / 1024).toFixed(1)} MB`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-gray-600">{label}</dt>
                  <dd className="text-right text-gray-300">{value}</dd>
                </div>
              ))}
            </dl>
            {selected ? (
              <div className="border-t border-white/10 pt-3">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-[7px] font-black uppercase tracking-widest text-[#fb394f]">Selected media</h4>
                    <p className="mt-2 truncate text-[8px] font-bold text-gray-200">{selected.file.name}</p>
                    <p className="mt-1 text-[7px] uppercase tracking-widest text-gray-600">
                      {selected.kind === 'image' ? `Image · ${selected.imageSize.width} × ${selected.imageSize.height}` : `${selected.kind} · ${formatTime(selected.duration)}`}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeAsset(selected)} aria-label="Remove selected media" className="text-gray-500 hover:text-red-300">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[7px] uppercase tracking-widest text-gray-600">
                    Timeline start
                    <input type="number" min="0" max={MAX_TIMELINE_SECONDS} step="0.5" value={selected.start} onChange={(event) => updateAsset(selected.id, { start: seconds(event.target.value) })} className="mt-1 w-full border border-white/10 bg-[#09090c] p-2 text-[9px] text-white" />
                  </label>
                  <label className="text-[7px] uppercase tracking-widest text-gray-600">
                    Track
                    <select value={selected.kind === 'audio' ? 3 : selected.track} disabled={selected.kind === 'audio'} onChange={(event) => updateAsset(selected.id, { track: Number(event.target.value) })} className="mt-1 w-full border border-white/10 bg-[#09090c] p-2 text-[9px] text-white">
                      {selected.kind === 'audio' ? <option value="3">Audio</option> : <><option value="1">Video 1</option><option value="2">Video 2</option></>}
                    </select>
                  </label>
                  {selected.kind === 'image' ? (
                    <>
                      <label className="col-span-2 text-[7px] uppercase tracking-widest text-gray-600">
                        Image duration (seconds)
                        <input type="number" min="0.1" max={MAX_TIMELINE_SECONDS} step="0.5" value={selected.outPoint} onChange={(event) => updateAsset(selected.id, { outPoint: seconds(event.target.value) })} className="mt-1 w-full border border-white/10 bg-[#09090c] p-2 text-[9px] text-white" />
                      </label>
                      <label className="text-[7px] uppercase tracking-widest text-gray-600">
                        Scale (%)
                        <input type="number" min="5" max="200" step="5" value={selected.imageScale} onChange={(event) => updateAsset(selected.id, { imageScale: signedNumber(event.target.value) })} className="mt-1 w-full border border-white/10 bg-[#09090c] p-2 text-[9px] text-white" />
                      </label>
                      <label className="text-[7px] uppercase tracking-widest text-gray-600">
                        Horizontal (%)
                        <input type="number" min="-50" max="50" step="1" value={selected.imageX} onChange={(event) => updateAsset(selected.id, { imageX: signedNumber(event.target.value) })} className="mt-1 w-full border border-white/10 bg-[#09090c] p-2 text-[9px] text-white" />
                      </label>
                      <label className="col-span-2 text-[7px] uppercase tracking-widest text-gray-600">
                        Vertical (%)
                        <input type="number" min="-50" max="50" step="1" value={selected.imageY} onChange={(event) => updateAsset(selected.id, { imageY: signedNumber(event.target.value) })} className="mt-1 w-full border border-white/10 bg-[#09090c] p-2 text-[9px] text-white" />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="text-[7px] uppercase tracking-widest text-gray-600">
                        Source in
                        <input type="number" min="0" max={selected.duration} step="0.1" value={selected.inPoint} onChange={(event) => updateAsset(selected.id, { inPoint: seconds(event.target.value) })} className="mt-1 w-full border border-white/10 bg-[#09090c] p-2 text-[9px] text-white" />
                      </label>
                      <label className="text-[7px] uppercase tracking-widest text-gray-600">
                        Source out
                        <input type="number" min="0.1" max={selected.duration} step="0.1" value={selected.outPoint} onChange={(event) => updateAsset(selected.id, { outPoint: seconds(event.target.value) })} className="mt-1 w-full border border-white/10 bg-[#09090c] p-2 text-[9px] text-white" />
                      </label>
                    </>
                  )}
                </div>
                {selected.kind === 'video' && (
                  <button type="button" onClick={playing ? () => videoRef.current?.pause() : startPreview} className="mt-3 inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-red-200">
                    {playing ? <X size={11} /> : <Plus size={11} />}
                    {playing ? 'Pause source' : 'Preview from trim in'}
                  </button>
                )}
              </div>
            ) : (
              <p className="border-t border-white/10 pt-3 text-[7px] leading-4 text-gray-600">
                Select a media item to adjust its track, timeline start, and trim points.
              </p>
            )}
            <p className="border border-amber-500/15 bg-amber-500/5 p-2 text-[7px] leading-4 text-amber-200/70">
              Large projects need substantial free browser memory. Export may fail on lower-memory devices.
            </p>
          </div>
        </aside>
      </div>

      <div className="border-t border-white/10 bg-[#101114]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-3 py-3">
          <div>
            <h3 className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-200">Timeline</h3>
            <p className="mt-1 text-[7px] uppercase tracking-widest text-gray-600">{assets.length} assets · {formatTime(totalDuration)} · V2 overlays V1 · drag to move · Delete to remove</p>
          </div>
          <span className="text-[8px] tabular-nums text-gray-500">{(totalBytes / 1024 / 1024).toFixed(1)} / 1024 MB</span>
        </div>
        <div className="overflow-x-auto p-3">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
              <div />
              <div className="grid grid-cols-6 border-b border-white/10 pb-2 text-[7px] tabular-nums text-gray-600">
                {Array.from({ length: 6 }, (_, index) => <span key={index}>{formatTime((timelineScale * index) / 5)}</span>)}
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              {[2, 1, 3].map((track) => (
                <div key={track} className="grid grid-cols-[64px_minmax(0,1fr)] items-stretch gap-2">
                  <div className="flex items-center border border-white/5 bg-[#191b20] px-2 text-[7px] font-black uppercase tracking-widest text-gray-500">
                    {track === 3 ? 'Audio' : `Video ${track}`}
                  </div>
                  <div
                    className="relative min-h-11 overflow-hidden border border-white/10 bg-[#09090c]"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleTimelineDrop(event, track)}
                  >
                    {assets.filter((asset) => asset.track === track).map((asset) => {
                      const left = (asset.start / timelineScale) * 100;
                      const width = (Math.max(0.5, asset.outPoint - asset.inPoint) / timelineScale) * 100;
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          draggable
                          onClick={() => setSelectedId(asset.id)}
                          onDragStart={(event) => handleClipDragStart(event, asset)}
                          title={`${asset.file.name} · ${formatTime(asset.start)}`}
                          className={`absolute inset-y-1 cursor-grab truncate border px-2 text-left text-[7px] font-bold active:cursor-grabbing ${
                            selectedId === asset.id
                              ? 'border-red-400/70 bg-red-500/25 text-red-100'
                              : track === 3
                                ? 'border-sky-400/30 bg-sky-500/15 text-sky-100'
                                : asset.kind === 'image'
                                  ? 'border-amber-400/30 bg-amber-500/15 text-amber-100'
                                  : 'border-violet-400/30 bg-violet-500/15 text-violet-100'
                          }`}
                          style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                        >
                          {asset.kind === 'image' ? 'IMG · ' : ''}{asset.file.name}
                        </button>
                      );
                    })}
                    {!assets.some((asset) => asset.track === track) && (
                      <span className="absolute inset-0 flex items-center px-3 text-[7px] uppercase tracking-widest text-gray-700">
                        {track === 3 ? 'Add music or voice-over' : 'Add a video clip or image'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
