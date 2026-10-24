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
  title: "EcoDaur — Karya Rahil Azwar",
  description:
    "Website EcoDaur karya Rahil Azwar: komunitas daur ulang kreatif Indonesia — tutorial video, pameran karya, dan jejaring sosial karya daur ulang. Kelola sampah dari rumah dengan EcoDaur.",
  applicationName: "EcoDaur",
  authors: [{ name: "Rahil Azwar" }],
  keywords: [
    "EcoDaur",
    "Rahil Azwar",
    "daur ulang",
    "sampah",
    "kerajinan bekas",
    "komunitas",
    "eco-brick",
    "recycle",
  ],
  creator: "Rahil Azwar",
  openGraph: {
    title: "EcoDaur — Karya Rahil Azwar",
    description:
      "Website EcoDaur karya Rahil Azwar: ubah sampah jadi karya — tutorial video asli, pameran komunitas, dan feed karya bergaya media sosial.",
    siteName: "EcoDaur — Karya Rahil Azwar",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary",
    title: "EcoDaur — Karya Rahil Azwar",
    description:
      "Website EcoDaur karya Rahil Azwar: ubah sampah jadi karya — tutorial video asli, pameran komunitas, dan feed karya bergaya media sosial.",
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
