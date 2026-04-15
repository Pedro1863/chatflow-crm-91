import { Download, FileText, Play, Pause, Image as ImageIcon, Film, Mic, StickerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  type: string;
  mediaUrl: string | null;
  mediaId: string | null;
  mimeType: string | null;
  fileName: string | null;
  mensagem: string;
}

export function MediaMessage({ type, mediaUrl, mediaId, mimeType, fileName, mensagem }: Props) {
  const src = mediaUrl || "";
  const hasMedia = !!mediaUrl;

  if (type === "text" || !type) {
    return <p className="leading-relaxed">{mensagem}</p>;
  }

  if (!hasMedia && mediaId) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs italic">
        <TypeIcon type={type} />
        <span>Mídia indisponível (ID: {mediaId?.slice(0, 8)}...)</span>
      </div>
    );
  }

  if (!hasMedia) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs italic">
        <TypeIcon type={type} />
        <span>Mídia indisponível</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mensagem && type !== "text" && !mensagem.startsWith("[") && (
        <p className="leading-relaxed text-sm">{mensagem}</p>
      )}
      <MediaRenderer type={type} src={src} mimeType={mimeType} fileName={fileName} />
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  const cls = "h-4 w-4";
  switch (type) {
    case "image": return <ImageIcon className={cls} />;
    case "audio": return <Mic className={cls} />;
    case "video": return <Film className={cls} />;
    case "document": return <FileText className={cls} />;
    case "sticker": return <StickerIcon className={cls} />;
    default: return <FileText className={cls} />;
  }
}

function MediaRenderer({ type, src, mimeType, fileName }: { type: string; src: string; mimeType: string | null; fileName: string | null }) {
  switch (type) {
    case "image": return <ImagePreview src={src} />;
    case "sticker": return <StickerPreview src={src} />;
    case "audio": return <AudioPlayer src={src} mimeType={mimeType} />;
    case "video": return <VideoPlayer src={src} mimeType={mimeType} />;
    case "document": return <DocumentPreview fileName={fileName} mimeType={mimeType} />;
    default: return <p className="text-xs text-muted-foreground italic">Tipo desconhecido: {type}</p>;
  }
}

function ImagePreview({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt="Imagem"
        className="max-w-full max-h-60 rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
        onClick={() => setOpen(true)}
        loading="lazy"
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 backdrop-blur-sm">
          <DialogTitle className="sr-only">Visualizar imagem</DialogTitle>
          <img src={src} alt="Imagem ampliada" className="w-full h-full object-contain rounded" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function StickerPreview({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt="Sticker"
      className="w-32 h-32 object-contain"
      loading="lazy"
    />
  );
}

function AudioPlayer({ src, mimeType }: { src: string; mimeType: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const onEnded = () => setPlaying(false);

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-3 min-w-[200px]">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        preload="metadata"
      />
      <button
        onClick={toggle}
        className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors shrink-0"
      >
        {playing ? <Pause className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4 text-primary ml-0.5" />}
      </button>
      <div className="flex-1 space-y-1">
        <div
          className="h-1.5 bg-muted rounded-full cursor-pointer relative overflow-hidden"
          onClick={seekTo}
        >
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
            style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatTime(progress)}</span>
          <span>{duration ? formatTime(duration) : "--:--"}</span>
        </div>
      </div>
      <Mic className="h-4 w-4 text-primary/50 shrink-0" />
    </div>
  );
}

function VideoPlayer({ src, mimeType }: { src: string; mimeType: string | null }) {
  return (
    <video
      src={src}
      controls
      className="max-w-full max-h-60 rounded-lg"
      preload="metadata"
    />
  );
}

function DocumentPreview({ fileName, mimeType }: { fileName: string | null; mimeType: string | null }) {
  const isPdf = mimeType?.includes("pdf") || fileName?.endsWith(".pdf");
  return (
    <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
      <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName || "Documento"}</p>
        <p className="text-[11px] text-muted-foreground">{isPdf ? "PDF" : mimeType || "Documento"}</p>
      </div>
    </div>
  );
}

function DownloadButton({ src, fileName, type }: { src: string; fileName: string | null; type: string }) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = fileName || `${type}_${Date.now()}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors"
    >
      <Download className="h-3 w-3" />
      <span>Baixar</span>
    </button>
  );
}
