import dynamic from 'next/dynamic';
import React from 'react';
import "./style.css";

// Define the props interface here too so it's available for both components
interface RichTextEditorProps {
  initialValue?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  width?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  className?: string;
  readOnly?: boolean;
}

// Create a placeholder component to show while loading
const EditorPlaceholder: React.FC<{
  minHeight?: string | number;
  width?: string | number;
}> = ({ minHeight = '100px', width = '100%' }) => {
  return (
    <div 
      style={{ 
        minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
        width: typeof width === 'number' ? `${width}px` : width,
        backgroundColor: '#f9f9f9', 
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <span style={{ color: '#bfbfbf' }}>Loading editor...</span>
    </div>
  );
};

// Import the component with SSR disabled
const RichTextEditorClient = dynamic<RichTextEditorProps>(
  () => import('./client').then(mod => mod.default), 
  { 
    ssr: false,
    loading: () => <EditorPlaceholder />
  }
);

export default RichTextEditorClient;