import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Murthehelp — Fictional Prop Exchange",
  description:
    "A cinematic, fictional prop catalogue inspired by secret-network thrillers. Browse inert display props in a safe, non-transactional interface.",
  applicationName: "Murthehelp",
  keywords: ["Murthehelp", "fictional props", "cinematic interface", "display props", "simulation"],
  openGraph: {
    title: "Murthehelp — Fictional Prop Exchange",
    description: "A fictional prop catalogue and secure-network interface for stories and tabletop worlds.",
    siteName: "Murthehelp",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Murthehelp — Fictional Prop Exchange",
    description: "A fictional prop catalogue for stories and tabletop worlds.",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
