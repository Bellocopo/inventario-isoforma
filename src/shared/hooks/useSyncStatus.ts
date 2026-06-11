import type { SyncStatus } from "@/shared/components/SyncIndicator";
import { db } from "@/shared/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";

const INITIAL_TIMEOUT_MS = 6000; // sem contato com servidor após mount
const RECONNECT_TIMEOUT_MS = 4000; // perdeu contato após já ter conectado

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(
    navigator.onLine ? "syncing" : "offline",
  );

  useEffect(() => {
    let hadServerContact = false;
    let offlineTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleOffline(ms: number) {
      if (!offlineTimer) {
        offlineTimer = setTimeout(() => setStatus("offline"), ms);
      }
    }

    function cancelOffline() {
      if (offlineTimer) {
        clearTimeout(offlineTimer);
        offlineTimer = null;
      }
    }

    // Se o servidor não responder dentro de INITIAL_TIMEOUT_MS desde o mount,
    // declaramos offline (cobre: emulador desligado desde o início).
    scheduleOffline(INITIAL_TIMEOUT_MS);

    const unsubscribe = onSnapshot(
      query(collection(db, "catalog")),
      { includeMetadataChanges: true },
      (snapshot) => {
        const { fromCache, hasPendingWrites } = snapshot.metadata;

        if (!fromCache) {
          // Dado veio diretamente do servidor — conexão confirmada.
          hadServerContact = true;
          cancelOffline();
          setStatus(hasPendingWrites ? "syncing" : "online");
          return;
        }

        // fromCache = true a partir daqui

        if (!navigator.onLine) {
          cancelOffline();
          setStatus("offline");
          return;
        }

        if (hasPendingWrites) setStatus("syncing");

        // Após ter tido contato com servidor, voltar para cache = perda de conexão.
        // Inicia timer de reconexão (cobre: emulador derrubado após conectar).
        if (hadServerContact) scheduleOffline(RECONNECT_TIMEOUT_MS);
        // Caso ainda não haja contato, o timer do mount já está rodando.
      },
      () => {
        cancelOffline();
        setStatus("offline");
      },
    );

    function onOffline() {
      cancelOffline();
      setStatus("offline");
    }
    function onOnline() {
      // Navegador voltou online — dá tempo pro Firestore reconectar.
      cancelOffline();
      scheduleOffline(INITIAL_TIMEOUT_MS);
      setStatus("syncing");
    }
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      unsubscribe();
      cancelOffline();
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return status;
}
