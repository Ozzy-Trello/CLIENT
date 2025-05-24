import { Metadata } from "next";

const metadata: Metadata = {
  title: 'Workspace | Ozzy Clothing',
  description: "Workspaces page Ozzy Clothing"
}

const WorkspaceLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
  return children;
}

export default WorkspaceLayout;