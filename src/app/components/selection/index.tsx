import { Select } from "antd";
import { useState } from "react";

export const WorkspaceSelection: React.FC = () => {

  const [options, setOptions] = useState([
    
  ]);

  const handleChange = (value: string) => {
    console.log(`selected ${value}`);
  };

  return(
    <Select
      defaultValue="workspace-default"                                                                                              
      style={{ width: 200 }}
      onChange={handleChange}
      options={[
        {
          label: <span>manager</span>,
          title: 'manager',
          options: [
            { label: <span>Jack</span>, value: 'Jack' },
            { label: <span>Lucy</span>, value: 'Lucy' },
          ],
        },
        {
          label: <span>engineer</span>,
          title: 'engineer',
          options: [
            { label: <span>Chloe</span>, value: 'Chloe' },
            { label: <span>Lucas</span>, value: 'Lucas' },
          ],
        },
      ]}
    />
  )
}

export const VisibilitySelection: React.FC = () => {

  const [options, setOption] = useState([
    
  ]);

  const handleChange = (value: string) => {
    console.log(`selected ${value}`);
  };

  return(
    <Select
      defaultValue="workspace-default"                                                                                              
      style={{ width: 200 }}
      onChange={handleChange}
      options={[
        {
          label: <span>manager</span>,
          title: 'manager',
          options: [
            { label: <span>Jack</span>, value: 'Jack' },
            { label: <span>Lucy</span>, value: 'Lucy' },
          ],
        },
        {
          label: <span>engineer</span>,
          title: 'engineer',
          options: [
            { label: <span>Chloe</span>, value: 'Chloe' },
            { label: <span>Lucas</span>, value: 'Lucas' },
          ],
        },
      ]}
    />
  )
}