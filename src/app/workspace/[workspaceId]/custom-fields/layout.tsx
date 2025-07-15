import { ReactNode } from "react";

interface CustomFieldsLayoutProps {
  children: ReactNode;
}

export default function CustomFieldsLayout({
  children,
}: CustomFieldsLayoutProps) {
  return <>{children}</>;
}
