"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { ConfigProvider } from "antd";
import { selectTheme } from "../store/app_slice";
import { getContrastingTextColor, getGradientString } from "../utils/general";
import { selectCurrentBoard } from "../store/workspace_slice";

export function ThemeProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) {
  const theme = useSelector(selectTheme);
  const selectedBoard = useSelector(selectCurrentBoard);
  const { colors, fontSizes } = theme;
  let root: HTMLElement;

  useEffect(() => {
    if (!root) root = document.documentElement;
    if (selectedBoard) {
      if (Array.isArray(selectedBoard.background)) {
        root.style.setProperty(
          `--color-board-page-background-color`,
          getGradientString(selectedBoard.background) as string
        );
        const textColor = getContrastingTextColor(
          selectedBoard.background[0].color
        );
        root.style.setProperty(`--color-text`, textColor);
      } else {
        root.style.setProperty(
          `--color-board-page-background-color`,
          selectedBoard.background as string
        );
        const textColor = getContrastingTextColor(
          selectedBoard.background as string
        );
        root.style.setProperty(`--color-text`, textColor);
      }
    } else {
      root.style.setProperty(
        `--color-board-page-background-color`,
        root.style.getPropertyValue(`--color-background`)
      );
    }
  }, [selectedBoard]);

  // Apply theme to CSS variables
  useEffect(() => {
    if (colors) {
      if (!root) root = document.documentElement;
      Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value as string);
      });
    }
  }, [colors]);

  useEffect(() => {
    if (fontSizes) {
      if (!root) root = document.documentElement;
      Object.entries(fontSizes).forEach(([key, value]) => {
        root.style.setProperty(`--font-size-${key}`, value as string);
      });
    }
  }, [fontSizes]);

  // Ant Design theme config
  const antdTheme = {
    token: {
      colorPrimary: colors?.primary,
      colorSecondary: colors?.secondary,
      colorAccent: colors?.accent,
    },
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          Layout: {
            siderBg: selectedBoard?.background,
          },
          Menu: {
            colorBgContainer: selectedBoard?.background,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
