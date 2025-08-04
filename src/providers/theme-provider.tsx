"use client";

import { useEffect, useState } from "react";
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
  const [isMounted, setIsMounted] = useState(false);
  const [currentPathname, setCurrentPathname] = useState<string | null>(null);
  
  // Get pathname safely
  let pathname: string | null = null;
  try {
    pathname = usePathname();
  } catch (error) {
    // Fallback if usePathname fails
    pathname = null;
  }
  
  const { colors, fontSizes } = theme;
  let root: HTMLElement;

  // Set mounted state after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update pathname state when it changes
  useEffect(() => {
    if (isMounted && pathname) {
      setCurrentPathname(pathname);
    }
  }, [isMounted, pathname]);

  useEffect(() => {
    if (!isMounted) return; // Only run after component is mounted
    
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
      currentPathname || ""
    );
    console.log(
      "Current path:",
      currentPathname,
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
  }, [selectedBoard, currentPathname, isMounted]);

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
          colorPrimary: `rgb(${colors?.primary})`,
          colorBgContainer: `rgb(${colors?.surface})`,
          colorBgElevated: `rgb(${colors?.surface})`,
          colorText: `rgb(${colors?.text})`,
          colorTextSecondary: `rgb(${colors?.['text-muted']})`,
          colorBorder: `rgb(${colors?.border})`,
          colorBgBase: `rgb(${colors?.background})`,
        },
        components: {
          Layout: {
            // Apply dark background to sider
            siderBg: `rgb(${colors?.surface})`,
            colorBgContainer: `rgb(${colors?.surface})`,
            colorText: `rgb(${colors?.text})`,
          },
          Menu: {
            // Dark theme menu styling
            colorBgContainer: "transparent", // Fully transparent to inherit from parent
            colorItemBg: "transparent", // Transparent item background
            colorItemText: `rgb(${colors?.text})`, // Light text color
            colorItemTextHover: `rgb(${colors?.primary})`, // Hover text color
            colorItemBgSelected: `rgba(${colors?.primary}, 0.1)`, // Subtle background for selected items
            colorItemBgHover: `rgba(${colors?.primary}, 0.1)`, // Subtle background for hover
            colorActiveBarWidth: 0, // Remove active bar
          },
          Modal: {
            // Dark theme modals
            contentBg: `rgb(${colors?.surface})`, // Dark background for modal content
            headerBg: `rgb(${colors?.surface})`, // Dark background for modal header
            footerBg: `rgb(${colors?.surface})`, // Dark background for modal footer
            titleColor: `rgb(${colors?.text})`, // Light text for title
            colorText: `rgb(${colors?.text})`, // Light text color
          },
          Card: {
            // Dark theme cards
            colorBgContainer: `rgb(${colors?.surface})`, // Dark background for cards
            colorText: `rgb(${colors?.text})`, // Light text color
          },
          Drawer: {
            // Dark theme drawers
            colorBgElevated: `rgb(${colors?.surface})`, // Dark background for drawers
            colorText: `rgb(${colors?.text})`, // Light text color
          },
          Input: {
            // Dark theme inputs
            colorBgContainer: `rgb(${colors?.background})`,
            colorText: `rgb(${colors?.text})`,
            colorBorder: `rgb(${colors?.border})`,
          },
          Select: {
            // Dark theme selects
            colorBgContainer: `rgb(${colors?.background})`,
            colorText: `rgb(${colors?.text})`,
            colorBorder: `rgb(${colors?.border})`,
          },
          Button: {
            // Dark theme buttons
            colorText: `rgb(${colors?.text})`,
            colorBorder: `rgb(${colors?.border})`,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
