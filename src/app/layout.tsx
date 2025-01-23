'use client';
import { AntdRegistry } from "@ant-design/nextjs-registry";
import localFont from "next/font/local";
import "./globals.css";
import { WorkspaceSidebarProvider } from "./workspace/workspace-sidebar-context";
import { store } from "./store";
import { Provider } from "react-redux";
import { metadata } from './metadata'; 
import { ThemeProvider } from "./provider/theme-provider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Provider store={store}>
          <AntdRegistry>
            <ThemeProvider userId="1">
              <WorkspaceSidebarProvider>{children}</WorkspaceSidebarProvider>
            </ThemeProvider>
          </AntdRegistry>
        </Provider>
      </body>
    </html>
  );
}
