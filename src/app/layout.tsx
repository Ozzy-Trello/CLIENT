import "./globals.css";
import { Metadata } from "next";
import { Providers } from "../providers";
import { ChunkLoadErrorHandler } from "@components/ChunkLoadErrorHandler";

const cacheBustVersion =
  process.env.NEXT_PUBLIC_APP_BUILD_VERSION ||
  process.env.npm_package_version ||
  "0.1.0";

export const metadata: Metadata = {
  title: "Ozzy Clothing Production",
  description: "Ozzy Clothing Production app",
  icons: "favicon.ico",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-image-preview": "none",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
        <link rel="manifest" href={`/manifest.json?v=${cacheBustVersion}`} />
        <meta name="theme-color" content="#1890ff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ozzy" />
        <meta name="app-build-version" content={cacheBustVersion} />
        <link rel="icon" href={`/favicon.ico?v=${cacheBustVersion}`} sizes="any" />
        <link rel="apple-touch-icon" href={`/icon-192.png?v=${cacheBustVersion}`} />
      </head>
      <body>
        <ChunkLoadErrorHandler />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
