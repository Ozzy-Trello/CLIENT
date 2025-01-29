'use client';
import { AntdRegistry } from "@ant-design/nextjs-registry";
import localFont from "next/font/local";
import "./globals.css";
import { WorkspaceSidebarProvider } from "@/app/provider/workspace-sidebar-context";
import { store } from "./store";
import { Provider } from "react-redux";
import { ThemeProvider } from "./provider/theme-provider";
import { ScreenSizeProvider } from "./provider/screen-size-provider";
import { Metadata } from "next";

const geistSans = localFont({
  src: "./assets/fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./assets/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const metadata: Metadata = {
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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Provider store={store}>
          <ScreenSizeProvider>
            <AntdRegistry>
              <ThemeProvider userId="1">
                <WorkspaceSidebarProvider>
                  {children}
                </WorkspaceSidebarProvider>
              </ThemeProvider>
            </AntdRegistry>
          </ScreenSizeProvider>
        </Provider>
      </body>
    </html>
  );
}
