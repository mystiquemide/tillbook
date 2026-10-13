"use client";

import { useCallback, useEffect, useState } from "react";
import { useSignMessage } from "wagmi";
import { VIEW_HEADERS, VIEW_TTL_SECONDS, viewMessage } from "./viewAuth";

type Auth = { expires: number; signature: string };
const key = (address: string) => `tillbook:view:${address.toLowerCase()}`;

function stored(address: string): Auth | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(key(address)) ?? "null") as Auth | null;
    return v && v.expires * 1000 > Date.now() + 60_000 ? v : null;
  } catch {
    return null;
  }
}

/** One signature per wallet per day unlocks that wallet's private history. Kept for this tab only. */
export function useViewAuth(address: string | undefined) {
  const { signMessageAsync } = useSignMessage();
  const [auth, setAuth] = useState<Auth | null>(null);
  const [signing, setSigning] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setAuth(address ? stored(address) : null), [address]);

  const authorize = useCallback(async () => {
    if (!address) return;
    setFailed(false);
    setSigning(true);
    try {
      const expires = Math.floor(Date.now() / 1000) + VIEW_TTL_SECONDS;
      const signature = await signMessageAsync({ message: viewMessage(address, expires) });
      const v = { expires, signature };
      try {
        sessionStorage.setItem(key(address), JSON.stringify(v));
      } catch {}
      setAuth(v);
    } catch {
      setFailed(true);
    } finally {
      setSigning(false);
    }
  }, [address, signMessageAsync]);

  const clear = useCallback(() => {
    if (address)
      try {
        sessionStorage.removeItem(key(address));
      } catch {}
    setAuth(null);
  }, [address]);

  const headers: Record<string, string> | undefined = auth
    ? { [VIEW_HEADERS.expires]: String(auth.expires), [VIEW_HEADERS.signature]: auth.signature }
    : undefined;

  return { authorized: !!auth, headers, authorize, clear, signing, failed };
}
