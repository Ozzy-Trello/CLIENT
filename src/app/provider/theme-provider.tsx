'use client'

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfigProvider } from 'antd';
import { RootState } from '../store';
import { selectTheme } from '../store/slice';

export function ThemeProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const dispatch = useDispatch();
  // const { colors, isLoading } = useSelector((state: RootState) => state.theme);
  const theme = useSelector(selectTheme);
  const { colors, fontSizes } = theme;
  let root: HTMLElement;

  // useEffect(() => {
  //   async function fetchTheme() {
  //     dispatch(setLoading(true));
  //     try {
  //       const themeData = await themeService.fetchTheme(userId);
  //       dispatch(setTheme(themeData));
  //     } catch (error) {
  //       dispatch(setError(error.message));
  //     } finally {
  //       dispatch(setLoading(false));
  //     }
  //   }

  //   fetchTheme();
  // }, [dispatch, userId]);

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
      })
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
    <ConfigProvider theme={antdTheme}>
      {children}
    </ConfigProvider>
  );
}