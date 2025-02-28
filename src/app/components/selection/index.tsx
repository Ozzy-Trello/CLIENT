import { Workspace } from "@/app/dto/types";
import { selectSelectedWorkspace, setSelectedWorkspace } from "@/app/store/slice";
import { workspaces } from "@/dummy-data";
import { Select } from "antd";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";

export const WorkspaceSelection: React.FC = () => {

  const [workspaceList, setWorkspaceList] = useState<Workspace[]>(workspaces);
  const [options, setOptions] = useState<{ label: string; value: string; }[]>([]);
  const selectedWorkspace = useSelector(selectSelectedWorkspace);
  const dispatch = useDispatch();
  const router = useRouter();

  const handleChange = (value: string) => {
    dispatch(setSelectedWorkspace(value));
    router.push(`/workspace/${selectedWorkspace}/board`);
  };

  useEffect(() => {
    let opt = workspaceList.map((item) => {
      return {
        label: item.name,
        value: item.id
      }
    });
    setOptions(opt);
  }, [])

  return(
    <Select
      style={{minWidth: "100px"}}
      showSearch
      placeholder="Select a workspace"
      defaultValue={selectedWorkspace}
      optionFilterProp="label"
      onChange={handleChange}
      // onSearch={onSearch}
      options={options}
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