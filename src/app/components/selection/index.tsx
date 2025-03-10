import { Select } from "antd";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useTaskService from "@/app/hooks/task";

export const WorkspaceSelection: React.FC = () => {
  const { taskService, workspaces, currentWorkspace } = useTaskService();
  const [options, setOptions] = useState<{ label: string; value: string; }[]>([]);
  const router = useRouter();
  
  const handleChange = (value: string) => {
    const ws = workspaces.find(ws => ws.id === value);
    if (ws) {
      taskService.selectWorkspace(ws.id);
      router.push(`/workspace/${value}/board`);
    }
  };
  
  useEffect(() => {
    if (workspaces && workspaces.length > 0) {
      setOptions(workspaces.map((ws) => ({label: ws.name, value: ws.id})));
    }
  }, [workspaces]);
  
  // Determine current selected value
  const selectedValue = currentWorkspace?.id || (workspaces.length > 0 ? workspaces[0]?.id : undefined);
  
  return(
    <Select
      style={{minWidth: "100px"}}
      showSearch
      placeholder="Select a workspace"
      value={selectedValue}
      optionFilterProp="label"
      onChange={handleChange}
      options={options}
      notFoundContent={workspaces.length === 0 ? "No workspaces available" : "No match found"}
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