import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SEEN_KEY = "flowcrm:notified_msg_ids";
const MAX_SEEN = 200;

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(set: Set<string>) {
  try {
    const arr = Array.from(set).slice(-MAX_SEEN);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

let audioCtx: AudioContext | null = null;
function playNotificationSound() {
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});

    const now = audioCtx.currentTime;
    // Two short beeps (WhatsApp-like ping)
    const tones: Array<[number, number]> = [
      [880, 0],     // A5 at t=0
      [1320, 0.12], // E6 at t=0.12s
    ];
    for (const [freq, offset] of tones) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    }
  } catch {
    // ignore
  }
}

async function ensureNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

/**
 * Subscribes to incoming WhatsApp messages and shows:
 * - sonner toast (always)
 * - native browser notification (when tab not focused)
 *
 * Mount once at app root.
 */
export function useMessageNotifications() {
  const seenRef = useRef<Set<string>>(loadSeen());
  const mountedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    ensureNotificationPermission();

    const channel = supabase
      .channel(`rt-notify-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens" },
        async (payload) => {
          const msg = payload.new as {
            id: string;
            contato_id: string;
            telefone: string | null;
            mensagem: string;
            direcao: string;
            timestamp: string;
            type: string;
          };

          if (msg.direcao !== "entrada") return;

          // Ignore messages older than the moment this hook mounted
          if (new Date(msg.timestamp).getTime() < mountedAtRef.current - 5000) return;

          if (seenRef.current.has(msg.id)) return;
          seenRef.current.add(msg.id);
          saveSeen(seenRef.current);

          // Look up contato name for nicer label
          let title = msg.telefone || "Nova mensagem";
          try {
            const { data } = await supabase
              .from("contatos")
              .select("nome,telefone")
              .eq("id", msg.contato_id)
              .maybeSingle();
            if (data) title = data.nome || data.telefone || title;
          } catch {
            // ignore
          }

          const body =
            msg.type === "text"
              ? msg.mensagem
              : `[${msg.type}] ${msg.mensagem || ""}`.trim();

          // Notification sound
          playNotificationSound();

          // In-app toast
          toast(title, { description: body });

          // Native notification when tab hidden / unfocused
          if (
            typeof document !== "undefined" &&
            document.visibilityState !== "visible" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              const n = new Notification(title, {
                body,
                tag: `msg-${msg.contato_id}`,
                icon: "/public/favicon.svg",
              });
              n.onclick = () => {
                window.focus();
                n.close();
              };
            } catch {
              // ignore
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
