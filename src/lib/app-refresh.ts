"use client";

import { useEffect, useRef } from "react";

type RefreshListener = () => Promise<unknown> | unknown;

const listeners = new Set<RefreshListener>();

export const APP_REFRESH_EVENT = "academix:app-refresh";

export function registerRefreshListener(fn: RefreshListener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function triggerClientRefreshListeners() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(APP_REFRESH_EVENT));
  }
  const activeListeners = Array.from(listeners);
  if (activeListeners.length === 0) return;

  await Promise.allSettled(
    activeListeners.map(async (fn) => {
      try {
        await fn();
      } catch (err) {
        console.error("Error executing view refresh listener:", err);
      }
    })
  );
}

export function useAppRefresh(callback: RefreshListener) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return registerRefreshListener(() => callbackRef.current());
  }, []);
}

