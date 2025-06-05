"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { ConfigProvider } from "antd";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const { colors, fontSizes } = theme;
  let root: HTMLElement;

  useEffect(() => {
    if (!root) root = document.documentElement;

    // Reset all background properties first to avoid persistence issues
    document.body.style.backgroundImage = "none";
    document.body.style.backgroundColor = "";
    document.body.style.background = "";
    document.body.style.backgroundSize = "auto";
    document.body.style.backgroundPosition = "initial";
    document.body.style.backgroundRepeat = "repeat";
    document.body.style.backgroundAttachment = "scroll";
    // Check if we're on a specific board page by looking for /board/{id} pattern
    const isSpecificBoardPage = /\/workspace\/[\w-]+\/board\/[\w-]+$/.test(
      pathname || ""
    );
    console.log(
      "Current path:",
      pathname,
      "Is specific board page:",
      isSpecificBoardPage
    );

    // Only apply background if we're on a specific board page
    if (isSpecificBoardPage && selectedBoard && selectedBoard.background) {
      if (Array.isArray(selectedBoard.background)) {
        const backgroundValue = getGradientString(
          selectedBoard.background
        ) as string;
        root.style.setProperty(
          `--color-board-page-background-color`,
          backgroundValue
        );
        // Apply to body for full-page background
        document.body.style.background = backgroundValue;
        // Ensure background covers the entire viewport
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundAttachment = "fixed";

        const textColor = getContrastingTextColor(
          selectedBoard.background[0].color
        );
        root.style.setProperty(`--color-text`, textColor);
      } else {
        const backgroundValue = selectedBoard.background as string;

        // Check if background is an image URL - handle complex URLs with query parameters
        const isImageUrl =
          backgroundValue &&
          // Check for common image extensions in the URL path (before query params)
          (backgroundValue.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/) ||
            // Check for image-related keywords in URL
            backgroundValue.match(/\/(photo|image|img|foto)\//) ||
            // Check for common image hosting domains
            backgroundValue.match(
              /\.(istockphoto|unsplash|imgur|flickr|cloudinary)\.|images\./
            ) ||
            // Check for http URLs with image-related query params
            (backgroundValue.startsWith("http") &&
              (backgroundValue.includes("image") ||
                backgroundValue.includes("photo") ||
                backgroundValue.includes("picture"))) ||
            // Check for data URLs for images
            backgroundValue.startsWith("data:image"));

        if (isImageUrl) {
          // Clear any previous styles first
          document.body.style.backgroundColor = "";
          document.body.style.background = "";

          // Apply the image background directly to the body element
          const imageStyle = `
            background-image: url("${backgroundValue}") !important;
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            background-attachment: fixed !important;
          `;

          document.body.setAttribute("style", imageStyle);

          // Set CSS variable for consistency
          root.style.setProperty(
            `--color-board-page-background-color`,
            `url("${backgroundValue}")`
          );
        } else {
          // For color backgrounds, use the same direct approach
          const colorStyle = `
            background: ${backgroundValue || ""} !important;
            background-image: none !important;
          `;

          document.body.setAttribute("style", colorStyle);

          // Set CSS variable
          root.style.setProperty(
            `--color-board-page-background-color`,
            backgroundValue || ""
          );
        }

        const textColor = getContrastingTextColor(backgroundValue);
        root.style.setProperty(`--color-text`, textColor);
      }
    } else {
      // When no board is selected or board has no background
      const defaultBackground =
        root.style.getPropertyValue(`--color-background`) || "#f0f2f5";

      // Set CSS variable
      root.style.setProperty(
        `--color-board-page-background-color`,
        defaultBackground
      );

      // Apply default background using the same direct approach
      const defaultStyle = `
        background: ${defaultBackground} !important;
        background-image: none !important;
      `;

      document.body.setAttribute("style", defaultStyle);

      // Log the applied style for debugging
      console.log(
        "Applied default style:",
        document.body.getAttribute("style")
      );
    }
  }, [selectedBoard, pathname]);

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
        token: {
          colorPrimary: colors?.primary,
          colorBgContainer: "rgba(255, 255, 255, 0.85)",
          colorBgElevated: "rgba(255, 255, 255, 0.85)",
        },
        components: {
          Layout: {
            // Apply transparent background to sider
            siderBg: "rgba(255, 255, 255, 0.85)",
            colorBgContainer: "rgba(255, 255, 255, 0.85)",
          },
          Menu: {
            // Match the sider styling for menu
            colorBgContainer: "transparent", // Fully transparent to inherit from parent
            colorItemBg: "transparent", // Transparent item background
            colorItemTextHover: colors?.primary, // Hover text color
            colorItemBgSelected: "rgba(255, 255, 255, 0.8)", // Very subtle background for selected items
            colorItemBgHover: "rgba(255, 255, 255, 0.8)", // Subtle background for hover
            colorActiveBarWidth: 0, // Remove active bar
          },
          Modal: {
            // Ensure modals have solid background
            contentBg: "#ffffff", // Solid white background for modal content
            headerBg: "#ffffff", // Solid white background for modal header
            footerBg: "#ffffff", // Solid white background for modal footer
            titleColor: "rgba(0, 0, 0, 0.88)", // Default dark text for title
          },
          Card: {
            // Ensure cards have proper background
            colorBgContainer: "#ffffff", // Solid white background for cards
          },
          Drawer: {
            // Ensure drawers have solid background
            colorBgElevated: "#ffffff", // Solid white background for drawers
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
