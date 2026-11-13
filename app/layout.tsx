import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SONUS — Payments that understand you.",
  description: "Speak naturally. Understand recipients, context, and payments before you authorize.",
  applicationName: "Sonus",
  keywords: ["Sonus", "payment intelligence", "stablecoin payments", "voice payments"],
  openGraph: {
    title: "SONUS — Money, understood.",
    description: "Payment intelligence that keeps you in control.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#080A0F",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
