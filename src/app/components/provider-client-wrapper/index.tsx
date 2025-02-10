'use client';

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "@/app/store";
import { WorkspaceSidebarProvider } from "@/app/provider/workspace-sidebar-context";
import { ThemeProvider } from "@/app/provider/theme-provider";
import { ScreenSizeProvider } from "@/app/provider/screen-size-provider";
import { AntdRegistry } from "@ant-design/nextjs-registry";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={<p>Loading...</p>} persistor={persistor}>
        <ScreenSizeProvider>
          <AntdRegistry>
            <ThemeProvider userId="1">
              <WorkspaceSidebarProvider>
                {children}
              </WorkspaceSidebarProvider>
            </ThemeProvider>
          </AntdRegistry>
        </ScreenSizeProvider>
      </PersistGate>
    </Provider>
  );
}