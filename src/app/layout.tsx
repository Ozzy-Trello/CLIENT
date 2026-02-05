import "./globals.css";
import { Metadata } from "next";
import { Providers } from "../providers";
import { ChunkLoadErrorHandler } from "@components/ChunkLoadErrorHandler";

export const metadata: Metadata = {
  title: "Ozzy Clothing Production",
  description: "Ozzy Clothing Production app",
  icons: "favicon.ico",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://ozzyclothing.co.id",
    siteName: "Ozzy Clothing",
    title: "Ozzy Clothing",
    description: "Ozzy Clothing Production app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA manifest and meta tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1890ff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ozzy" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <ChunkLoadErrorHandler />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
