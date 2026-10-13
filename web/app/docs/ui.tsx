import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";

export function Code({ children }: { children: string }) {
  return (
    <pre className="my-5 overflow-x-auto rounded-[14px] bg-[#1b1819] p-5 font-mono text-[13px] leading-[1.7] text-[#ece9ff]">
      <code>{children}</code>
    </pre>
  );
}

export function Callout({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  const warn = tone === "warning";
  const Icon = warn ? AlertTriangle : Info;
  return (
    <div
      className={`my-5 flex gap-3 rounded-[14px] px-4 py-3.5 text-[15px] leading-[1.6] ring-1 ${
        warn ? "bg-[rgba(180,88,11,0.06)] text-ink ring-[rgba(180,88,11,0.2)]" : "bg-primary-tint text-ink ring-[rgba(110,84,255,0.18)]"
      }`}
    >
      <Icon size={17} className={`mt-1 shrink-0 ${warn ? "text-warning" : "text-primary-ink"}`} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-5 overflow-x-auto rounded-[14px] ring-1 ring-hairline">
      <table className="w-full text-left text-[14px]">
        <thead className="bg-surface text-ink-2">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-[450]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3 align-top leading-[1.55] break-words">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
