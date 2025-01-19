import React, { useState } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const RichTextEditor: React.FC = () => {
  const [value, setValue] = useState('');

  // Custom toolbar configuration
  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'], // Formatting options
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'image'], // Add links and images
      ['clean'], // Clear formatting
    ],
  };

  const formats = [
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

  return (
    <div>
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={setValue} 
        modules={modules} 
        formats={formats} 
        placeholder="Write something amazing..." 
      />
    </div>
  );
};

export default RichTextEditor;
