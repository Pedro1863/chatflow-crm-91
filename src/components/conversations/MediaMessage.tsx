import {
  FileText,
  Play,
  Pause,
  Image as ImageIcon,
  Film,
  Mic,
  StickerIcon,
} from "lucide-react";
import { useRef, useState, type MouseEvent } from "react";

interface Props {
  type: string;
  mediaUrl: string | null;
  mediaId: string | null;
  mimeType: string | null;
  fileName: string | null;
  mensagem: string;
}

export function MediaMessage({ type, mediaUrl, mediaId, mimeType, fileName, mensagem }: Props) {
  const src = mediaUrl?.trim() || "";
  const hasMedia = src.length > 0;

  if (type === "text" || !type) {
    return <p className="leading-relaxed">{mensagem}</p>;
  }

  if (!hasMedia && mediaId) {
    return (
      <div className="flex items-center gap-2 text-xs italic text-muted-foreground">
        <TypeIcon type={type} />
        <span>Mídia indisponível (ID: {mediaId.slice(0, 8)}...)</span>
      </div>
    );
  }

  if (!hasMedia) {
    return (
      <div className="flex items-center gap-2 text-xs italic text-muted-foreground">
        <TypeIcon type={type} />
        <span>Mídia indisponível</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <MediaRenderer type={type} src={src} mimeType={mimeType} fileName={fileName} />
      {mensagem && type !== "text" && !mensagem.startsWith("[") && (
        <p className="text-sm leading-relaxed">{mensagem}</p>
      )}
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  const cls = "h-4 w-4";

  switch (type) {
    case "image":
      return <ImageIcon className={cls} />;
    case "audio":
      return <Mic className={cls} />;
    case "video":
      return <Film className={cls} />;
    case "document":
      return <FileText className={cls} />;
    case "sticker":
      return <StickerIcon className={cls} />;
    default:
      return <FileText className={cls} />;
  }
}

function MediaRenderer({
  type,
  src,
  mimeType,
  fileName,
}: {
  type: string;
  src: string;
  mimeType: string | null;
  fileName: string | null;
}) {
  switch (type) {
    case "image":
      return <ImagePreview src={src} />;
    case "sticker":
      return <StickerPreview src={src} />;
    case "audio":
      return <AudioPlayer src={src} mimeType={mimeType} />;
    case "video":
      return <VideoPlayer src={src} mimeType={mimeType} />;
    case "document":
      return <DocumentPreview src={src} fileName={fileName} mimeType={mimeType} />;
    default:
      return <p className="text-xs italic text-muted-foreground">Tipo desconhecido: {type}</p>;
  }
}

function ImagePreview({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const effectiveSrc = blobUrl || src;

  const handleDirectError = () => {
    if (blobUrl) {
      setHasError(true);
      return;
    }
    fetch(src, { mode: "cors" })
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.blob();
      })
      .then((blob) => setBlobUrl(URL.createObjectURL(blob)))
      .catch(() => setHasError(true));
  };

  if (hasError) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-primary/70 hover:text-primary">
        <ImageIcon className="h-4 w-4" />
        <span>Abrir imagem</span>
      </a>
    );
  }

  return (
    <>
      <img
        src={effectiveSrc}
        alt="Imagem da conversa"
        className="max-h-72 w-full cursor-pointer rounded-lg border border-border/60 bg-muted/20 object-cover transition-opacity hover:opacity-90"
        onClick={() => setOpen(true)}
        onError={handleDirectError}
        loading="lazy"
        referrerPolicy="no-referrer"
      />

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <img
            src={effectiveSrc}
            alt="Imagem ampliada"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}

function StickerPreview({ src }: { src: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <MediaUnavailableLink src={src} label="Abrir figurinha" />;
  }

  return (
    <img
      src={src}
      alt="Sticker"
      className="h-32 w-32 object-contain"
      onError={() => setHasError(true)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

function AudioPlayer({ src, mimeType }: { src: string; mimeType: string | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  const getOrCreateAudio = () => {
    if (audioRef.current) {
      return audioRef.current;
    }

    const audio = new Audio(src);
    audio.preload = mimeType?.includes("mpeg") ? "auto" : "metadata";

    audio.onloadedmetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setError(false);
    };

    audio.ontimeupdate = () => {
      setProgress(audio.currentTime);
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    audio.onplay = () => {
      setPlaying(true);
      setLoading(false);
      setError(false);
    };

    audio.onpause = () => {
      setPlaying(false);
      setLoading(false);
    };

    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.onerror = () => {
      setPlaying(false);
      setLoading(false);
      setError(true);
      audioRef.current = null;
    };

    audioRef.current = audio;
    return audio;
  };

  const toggle = () => {
    const audio = getOrCreateAudio();

    if (playing) {
      audio.pause();
      return;
    }

    setLoading(true);
    setError(false);

    audio.play().catch(() => {
      setPlaying(false);
      setLoading(false);
      setError(true);
      audioRef.current = null;
    });
  };

  const seekTo = (e: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;

    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
    setProgress(audio.currentTime);
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-1">
      <div className="flex min-w-[200px] items-center gap-3 rounded-xl bg-muted/30 p-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 transition-colors hover:bg-primary/30"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          ) : playing ? (
            <Pause className="h-4 w-4 text-primary" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 text-primary" />
          )}
        </button>

        <div className="flex-1 space-y-1">
          <div className="relative h-1.5 cursor-pointer overflow-hidden rounded-full bg-muted" onClick={seekTo}>
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
              style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{formatTime(progress)}</span>
            <span>{duration ? formatTime(duration) : loading ? "..." : "--:--"}</span>
          </div>
        </div>

        <Mic className="h-4 w-4 shrink-0 text-primary/50" />
      </div>

      {error && <p className="text-[11px] text-muted-foreground">Não foi possível reproduzir este áudio.</p>}
    </div>
  );
}

function VideoPlayer({ src, mimeType }: { src: string; mimeType: string | null }) {
  return (
    <video
      src={src}
      controls
      className="max-h-72 max-w-full rounded-lg bg-muted/20"
      preload="metadata"
      playsInline
    />
  );
}

function DocumentPreview({
  src,
  fileName,
  mimeType,
}: {
  src: string;
  fileName: string | null;
  mimeType: string | null;
}) {
  const isPdf = mimeType?.includes("pdf") || fileName?.endsWith(".pdf");

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
        <FileText className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName || "Documento"}</p>
        <p className="text-[11px] text-muted-foreground">{isPdf ? "PDF" : mimeType || "Documento"}</p>
      </div>
    </a>
  );
}

function MediaUnavailableLink({ src, label }: { src: string; label: string }) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-xs text-primary/70 transition-colors hover:text-primary"
    >
      <ImageIcon className="h-4 w-4" />
      <span>{label}</span>
    </a>
  );
}
