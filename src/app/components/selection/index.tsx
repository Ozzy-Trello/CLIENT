import { Select } from "antd";
import { useEffect, useState } from "react";
import { useWorkspaces } from "@/app/hooks/workspace";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { selectCurrentWorkspace, setBoards, setCurrentWorkspace } from "@/app/store/workspace_slice";
import { useParams, useRouter } from "next/navigation";

export const WorkspaceSelection: React.FC = () => {
  const { workspaceId } = useParams();
  const [options, setOptions] = useState<{ label: string; value: string; }[]>([]);
  const { data } = useWorkspaces();
  const selectedWorkspace = useSelector(selectCurrentWorkspace);
  const dispatch = useDispatch();
  const router = useRouter();
  
  const handleChange = (value: string | undefined) => {
    if (!value) {
      dispatch(setCurrentWorkspace(null));
      router.push(`/workspace`);
    } else {
      const selected = data?.data?.find(item => item.id === value);
      dispatch(setCurrentWorkspace(selected));
      router.push(`/workspace/${value}`);
    }
  }
  
  useEffect(() => {
    if (data?.data) {
      const opt = data?.data?.map(item => ({label: item.name, value: item.id}));
      setOptions(opt);
      dispatch(setCurrentWorkspace(data.data[0]));
    } 
  }, [data]);
  
  useEffect(() => {
    if (!workspaceId) {
      dispatch(setCurrentWorkspace(null));
      router.push(`/workspace`);
    }
  }, [workspaceId])

  return(
    <Select
      style={{minWidth: "100px"}}
      showSearch
      placeholder="Select a workspace"
      value={selectedWorkspace?.id}
      optionFilterProp="label"
      onChange={handleChange}
      options={options}
      notFoundContent={data?.data?.length === 0 ? "No workspaces available" : "No match found"}
    />
  )
}

export const VisibilitySelection: React.FC = () => {

  const [ options, setOption ] = useState([
    {id: "private", label: "Private"},
    {id: "shared", label: "Shared"},
    {id: "public", label: "Public"},
  ]);

  const handleChange = (value: string) => {
    console.log(`selected ${value}`);
  };

  return(
    <Select
      defaultValue="workspace-default"                                                                                              
      style={{ width: 200 }}
      onChange={handleChange}
      options={options}
    />
  )
}