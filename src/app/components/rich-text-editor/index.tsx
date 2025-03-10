import React, { useState, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  initialValue?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  width?: string | number;
  height?: string | number;
  modules?: any;
  formats?: string[];
  className?: string;
  readOnly?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue = '',
  onChange,
  placeholder = 'description...',
  width = '100%',
  height = '200px',
  modules,
  formats,
  className = '',
  readOnly = false,
}) => {
  const [value, setValue] = useState<string>(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Default toolbar configuration
  const defaultModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'], // Formatting options
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'image'], // Add links and images
      ['clean'], // Clear formatting
    ],
  };

  const defaultFormats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'bullet',
    'align',
    'link',
    'image',
  ];

  const handleChange = (content: string) => {
    setValue(content);
    if (onChange) {
      onChange(content);
    }
  };

  const editorStyle = {
    width: width,
    height: height,
  };

  return (
    <div className={className} style={{ width }}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules || defaultModules}
        formats={formats || defaultFormats}
        placeholder={placeholder}
        style={editorStyle}
        readOnly={readOnly}
      />
    </div>
  );
};

export default RichTextEditor;