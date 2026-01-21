import "./globals.css";
import { Metadata } from "next";
import { Providers } from "../providers";
import { ChunkLoadErrorHandler } from "@/components/ChunkLoadErrorHandler";

export const metadata: Metadata = {
  title: "Ozzy Clothing Workflow",
  description: "Ozzy Clothing workflow app",
  icons: "favicon.ico",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://ozzyclothing.co.id",
    siteName: "Ozzy Clothing",
    title: "Ozzy Clothing",
    description: "Ozzy Clothing workflow app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ChunkLoadErrorHandler />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
