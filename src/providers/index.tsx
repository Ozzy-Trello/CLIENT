"use client";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { WorkspaceSidebarProvider } from "@providers/workspace-sidebar-context";
import { ThemeProvider } from "@providers/theme-provider";
import { UserProvider } from "@providers/user-provider";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import QueryProvider from "./query-provider";
import Loading from "../app/loading";
import { persistor, store } from "@store/index";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={<Loading />} persistor={persistor}>
        <QueryProvider>
          <UserProvider>
            <AntdRegistry>
              <ThemeProvider userId="1">
                <WorkspaceSidebarProvider>{children}</WorkspaceSidebarProvider>
              </ThemeProvider>
            </AntdRegistry>
          </UserProvider>
        </QueryProvider>
      </PersistGate>
    </Provider>
  );
}
