import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartHydrator } from "@/components/cart/cart-hydrator";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mediterraneanbear.marctonimas.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mediterranean Bear",
    template: "%s | Mediterranean Bear",
  },
  description:
    "Mediterranean-inspired t-shirts and accessories, printed on demand. Designs inspired by Mallorca, the Tramuntana mountains, and the Mediterranean sea.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Mediterranean Bear",
    title: "Mediterranean Bear",
    description:
      "Mediterranean-inspired t-shirts and accessories, printed on demand.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Mediterranean Bear",
    description:
      "Mediterranean-inspired t-shirts and accessories, printed on demand.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
        <CartDrawer />
        <CartHydrator />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
