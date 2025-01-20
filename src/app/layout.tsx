'use client';
import { AntdRegistry } from "@ant-design/nextjs-registry";
import localFont from "next/font/local";
import "./globals.css";
import { WorkspaceSidebarProvider } from "./workspace/workspace-sidebar-context";
import { store } from "./store";
import { Provider } from "react-redux";
import { metadata } from './metadata'; 
import ThemeProvider from "./theme/theme-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <Provider store={store}>
            <AntdRegistry>
              <WorkspaceSidebarProvider>{children}</WorkspaceSidebarProvider>
            </AntdRegistry>
          </Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
