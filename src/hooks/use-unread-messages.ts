import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "flowcrm:last_read_per_contato";

type ReadMap = Record<string, string>; // contato_id -> ISO timestamp

function loadReadMap(): ReadMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReadMap(map: ReadMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// Singleton state shared across hook instances
let readMapState: ReadMap = loadReadMap();
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((l) => l());
}

export function markContatoAsRead(contatoId: string) {
  readMapState = { ...readMapState, [contatoId]: new Date().toISOString() };
  saveReadMap(readMapState);
  notifyAll();
}

function useReadMap(): ReadMap {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return readMapState;
}

/**
 * Returns a map of contato_id -> unread incoming message count.
 * "Unread" = msgs with direcao=entrada whose timestamp is greater than
 * the last time the user opened that conversation.
 */
export function useUnreadCounts() {
  const qc = useQueryClient();
  const readMap = useReadMap();

  const { data: incoming = [] } = useQuery({
    queryKey: ["incoming-msg-timestamps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens")
        .select("contato_id,timestamp")
        .eq("direcao", "entrada")
        .order("timestamp", { ascending: false });
      if (error) throw error;
      return data as { contato_id: string; timestamp: string }[];
    },
  });

  // Realtime: refresh on new incoming msgs
  useEffect(() => {
    const channel = supabase
      .channel(`rt-unread-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens" },
        () => {
          qc.invalidateQueries({ queryKey: ["incoming-msg-timestamps"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const counts: Record<string, number> = {};
  for (const msg of incoming) {
    const lastRead = readMap[msg.contato_id];
    if (!lastRead || new Date(msg.timestamp) > new Date(lastRead)) {
      counts[msg.contato_id] = (counts[msg.contato_id] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Initializes "last read" for all known contatos to NOW on first ever load.
 * Prevents a fresh install from showing every historical msg as unread.
 */
export function useInitializeReadBaseline(contatoIds: string[]) {
  const initialize = useCallback(() => {
    const map = loadReadMap();
    if (Object.keys(map).length > 0) return;
    const now = new Date().toISOString();
    const next: ReadMap = {};
    contatoIds.forEach((id) => {
      next[id] = now;
    });
    readMapState = next;
    saveReadMap(next);
    notifyAll();
  }, [contatoIds]);

  useEffect(() => {
    if (contatoIds.length > 0) initialize();
  }, [contatoIds.length, initialize]);
}
