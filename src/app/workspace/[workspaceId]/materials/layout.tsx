import { ReactNode } from "react";

interface MaterialsLayoutProps {
  children: ReactNode;
}

export default function MaterialsLayout({
  children,
}: MaterialsLayoutProps) {
  return <>{children}</>;
}