import { SkipLink } from "@/components/SkipLink";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const description =
  "Take USDC payments on Monad. Every sale builds a record any lender can see. Draw an advance and repay it a little from each sale.";

export const metadata: Metadata = {
  title: "Tillbook: your sales are your credit",
  description,
  openGraph: { title: "Tillbook: your sales are your credit", description, type: "website", siteName: "Tillbook" },
  twitter: { card: "summary", title: "Tillbook: your sales are your credit", description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
