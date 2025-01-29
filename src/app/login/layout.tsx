import { Metadata } from "next";
import { ReactNode } from "react";

const metadata: Metadata = {
  title: 'Login | Ozzy Clothing',
  description: 'Ozzy Clothing',
}

const LoginLayout: React.FC<{children: ReactNode}> = ({ children }) => {
  return children;
};

export default LoginLayout;