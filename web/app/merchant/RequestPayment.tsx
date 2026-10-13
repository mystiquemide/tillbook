"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { parseUsdc } from "@/lib/format";
import { card } from "@/components/app/Notice";

/** Builds a payment link, optionally with a set amount, and a QR code customers can scan at the counter. */
export function RequestPayment({ address }: { address: `0x${string}` }) {
  const [input, setInput] = useState("");
  const [origin, setOrigin] = useState("");
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  const amount = parseUsdc(input);
  const invalid = input.trim() !== "" && amount === null;
  const url = `${origin}/pay/${address}${amount !== null ? `?amount=${input.trim()}` : ""}`;

  useEffect(() => {
    if (!origin) return;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#211d1d", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [url, origin]);

  return (
    <div className={`${card} p-6`}>
      <h2 className="text-[17px] font-[450]">Request a payment</h2>
      <p className="mt-1 text-[14px] leading-[1.5] text-ink-2">
        Customers scan this or open the link to pay you in USDC. Leave the amount empty to let them enter it.
      </p>
      <label htmlFor="request-amount" className="mt-5 block text-[13px] text-ink-2">
        Amount in USDC (optional)
      </label>
      <input
        id="request-amount"
        inputMode="decimal"
        autoComplete="off"
        placeholder="25.00"
        value={input}
        onChange={(e) => setInput(e.target.value.replace(",", "."))}
        aria-invalid={invalid}
        aria-describedby={invalid ? "request-error" : undefined}
        className="mt-2 h-11 w-full rounded-[12px] bg-surface px-4 font-mono text-[16px] ring-1 ring-hairline focus:ring-primary"
      />
      {invalid && (
        <p id="request-error" role="alert" className="mt-2 text-[13px] text-error">
          Enter an amount like 25 or 25.50.
        </p>
      )}
      <div
        role="img"
        aria-label={amount !== null ? `QR code to pay ${input.trim()} USDC` : "QR code for your payment link"}
        className="mx-auto mt-5 aspect-square w-full max-w-[220px] [&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={invalid || !origin}
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
          className="h-11 rounded-full bg-primary text-[15px] font-[450] text-white hover:bg-primary-ink disabled:bg-surface disabled:text-ink-2 disabled:ring-1 disabled:ring-hairline"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : undefined}
          download={`tillbook-pay${amount !== null ? `-${input.trim()}` : ""}.svg`}
          aria-disabled={invalid || !svg}
          className={`inline-flex h-11 items-center justify-center rounded-full bg-primary-tint text-[15px] font-[450] text-primary-ink hover:bg-[rgba(110,84,255,0.16)] ${
            invalid || !svg ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Download QR
        </a>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px]">
        {canShare && (
          <button
            type="button"
            disabled={invalid || !origin}
            onClick={() =>
              navigator
                .share({
                  title: "Pay with Tillbook",
                  text: amount !== null ? `Pay ${input.trim()} USDC with Tillbook` : "Pay me in USDC with Tillbook",
                  url,
                })
                .catch(() => {})
            }
            className="text-primary-ink hover:underline disabled:text-ink-3"
          >
            Share payment request
          </button>
        )}
        <a
          href={invalid ? undefined : url}
          target="_blank"
          rel="noreferrer"
          aria-disabled={invalid}
          className={`text-primary-ink hover:underline ${invalid ? "pointer-events-none text-ink-3" : ""}`}
        >
          Preview what customers see
        </a>
      </div>
    </div>
  );
}
