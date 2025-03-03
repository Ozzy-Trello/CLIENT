import "./globals.css";
import { Metadata } from "next";
import { Providers } from "./provider";


export const metadata: Metadata = {
  title: 'Ozzy Clothing',
  description: 'Ozzy Clothing',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}