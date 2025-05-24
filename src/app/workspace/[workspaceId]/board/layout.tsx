import { Metadata } from "next";

const metadata: Metadata = {
  title: 'Board | Ozzy Clothing',
  description: "Boards page of Ozzy Clothing"
}

const BoardLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
  return children;
}

export default BoardLayout;