'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedBoard, selectSelectedWorkspace, setSelectedBoard } from './store/slice';
import { useDispatch } from 'react-redux';

/**
 * Client component to required changes based on current route in Next.js App Router
 */
const BodyClassController: React.FC = () => {
  const pathname = usePathname();
  const selectedBoard = useSelector(selectSelectedBoard);
  const dispatch = useDispatch();
 
  useEffect(() => {
    // Check if the current path matches workspace/id-workspace-* pattern
    const isWorkspacePage = /^\/workspace\/[^/]+\/?$/.test(pathname);
    
    // Check if the current path matches workspace/id-workspace/board/id-boards pattern
    const isBoardPage = /^\/workspace\/[^/]+\/board\/[^/]+\/?$/.test(pathname);
   
    // Remove all related classes first
    document.body.classList.remove('workspace-page', 'board-page');
    
    // Add appropriate class based on the path
    if (isWorkspacePage) {
      document.body.classList.add('workspace-page');
      dispatch(setSelectedBoard(null));
    } else if (isBoardPage) {
      document.body.classList.add('board-page');
    }
   
    // Clean up when component unmounts
    return () => {
      document.body.classList.remove('workspace-page', 'board-page');
    };
  }, [pathname]); // Re-run when path changes
 
  // This component doesn't render anything
  return null;
}

export default BodyClassController;