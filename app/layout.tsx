import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SONUS — Money, understood.",
  description: "A more human way to understand and authorize digital payments.",
  applicationName: "Sonus",
  keywords: ["Sonus", "payment intelligence", "stablecoin payments", "voice payments"],
  openGraph: {
    title: "SONUS — Money, understood.",
    description: "Speak naturally. See what happens. Stay in control.",
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
      <body>{children}</body>
    </html>
  );
}
