import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { message } from 'antd';
import 'react-quill/dist/quill.snow.css';


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

const RichTextEditorClient: React.FC<RichTextEditorProps> = ({
  initialValue = '',
  onChange,
  placeholder = 'comment..',
  width = '100%',
  minHeight = '100px',
  maxHeight = '400px',
  className = '',
  readOnly = false,
}) => {
  const [value, setValue] = useState<string>(initialValue);
  const quillRef = useRef<ReactQuill>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Handle image paste
  useEffect(() => {
    if (readOnly || !containerRef.current) return;

    const pasteHandler = (e: ClipboardEvent) => {
      if (!e.clipboardData || !e.clipboardData.items) return;
      
      let imageFound = false;
      
      Array.from(e.clipboardData.items).forEach(item => {
        if (item.type.indexOf('image') !== -1) {
          imageFound = true;
          e.preventDefault();
          
          const file = item.getAsFile();
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = (event) => {
            if (!event.target?.result) return;
            
            const imageUrl = event.target.result as string;
            
            // Insert image into editor
            const quillEditor = quillRef.current?.getEditor();
            if (quillEditor) {
              const range = quillEditor.getSelection() || { index: quillEditor.getLength(), length: 0 };
              quillEditor.insertEmbed(range.index, 'image', imageUrl);
              
              // Move cursor after image
              quillEditor.setSelection(range.index + 1, 0);
              
              // Update React state
              const updatedContent = quillEditor.root.innerHTML;
              setValue(updatedContent);
              if (onChange) onChange(updatedContent);
              
              message.success('Image added');
              
              // Allow time for image to load, then adjust editor height
              setTimeout(adjustEditorHeight, 100);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    };

    containerRef.current.addEventListener('paste', pasteHandler);
    return () => {
      containerRef.current?.removeEventListener('paste', pasteHandler);
    };
  }, [readOnly, onChange]);

  // Adjust editor height based on content
  const adjustEditorHeight = () => {
    const quillEditor = quillRef.current?.getEditor();
    if (!quillEditor) return;
    
    const editorContainer = quillRef.current?.getEditor().root;
    if (!editorContainer) return;
    
    // Reset height to auto to get the actual content height
    editorContainer.style.height = 'auto';
    
    // Get content height
    const contentHeight = editorContainer.scrollHeight;
    
    // Convert minHeight and maxHeight to numbers
    const minHeightPx = typeof minHeight === 'string' 
      ? parseInt(minHeight) 
      : minHeight;
    
    const maxHeightPx = typeof maxHeight === 'string' 
      ? parseInt(maxHeight) 
      : maxHeight;
    
    // Set height based on content, within min/max bounds
    if (contentHeight < minHeightPx) {
      editorContainer.style.height = `${minHeightPx}px`;
      editorContainer.style.overflowY = 'hidden';
    } else if (contentHeight > maxHeightPx) {
      editorContainer.style.height = `${maxHeightPx}px`;
      editorContainer.style.overflowY = 'auto';
    } else {
      editorContainer.style.height = `${contentHeight}px`;
      editorContainer.style.overflowY = 'hidden';
    }
  };

  // Adjust height when content changes
  useEffect(() => {
    if (quillRef.current) {
      adjustEditorHeight();
    }
  }, [value]);

  // Adjust height on initial render
  useEffect(() => {
    // Wait for editor to be fully initialized
    setTimeout(adjustEditorHeight, 100);
  }, []);

  const handleChange = (content: string) => {
    setValue(content);
    if (onChange) {
      onChange(content);
    }
  };

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  };

  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image'
  ];

  // Define the custom styles inline
  const customStyles = {
    '.trello-editor-container .ql-container': {
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    '.trello-editor-container .ql-editor': {
      padding: '12px 15px',
    },
  };

  return (
    <>
      {/* Add a style tag for any custom CSS */}
      <style jsx global>{`
        .trello-editor-container .ql-container {
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .trello-editor-container .ql-editor {
          padding: 12px 15px;
        }
      `}</style>
      
      <div ref={containerRef} className={`trello-editor-container ${className}`} style={{ width }}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      </div>
    </>
  );
};

export default RichTextEditorClient;