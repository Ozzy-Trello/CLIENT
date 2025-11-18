import "./globals.css";
import { Metadata } from "next";
import { Providers } from "../providers";

export const metadata: Metadata = {
  title: "Workflow",
  description: "workflow app",
  icons: "favicon.ico",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://ozzyclothing.co.id",
    siteName: "Workflow",
    title: "Workflow",
    description: "workflow app",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
