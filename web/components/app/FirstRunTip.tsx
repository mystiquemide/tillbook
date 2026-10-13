"use client";

import Link from "next/link";
import { Compass, X } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "tillbook:onboarded";

export function markOnboarded() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
}

/** A one-time nudge toward the walkthrough for people who haven't seen it. The walkthrough stays in the account menu after. */
export function FirstRunTip() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(!localStorage.getItem(KEY));
    } catch {}
  }, []);
  if (!show) return null;
  return (
    <div className="rise flex items-center gap-3 rounded-[16px] bg-primary-tint px-4 py-3 text-primary-ink ring-1 ring-[rgba(110,84,255,0.18)]">
      <Compass size={18} className="shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[14px] leading-[1.5]">
        New to Tillbook or to crypto?{" "}
        <Link href="/start" className="font-[450] underline underline-offset-2">
          Take the 2-minute walkthrough
        </Link>
        .
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          markOnboarded();
          setShow(false);
        }}
        className="-m-2 rounded-full p-2 hover:bg-[rgba(110,84,255,0.12)]"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
