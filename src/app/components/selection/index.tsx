import { Avatar, Select, Typography } from "antd";
import { useEffect, useState } from "react";
import { useWorkspaces } from "@/app/hooks/workspace";
import { useDispatch } from "react-redux";
import { selectCurrentWorkspace, setCurrentWorkspace } from "@/app/store/workspace_slice";
import { useParams, useRouter } from "next/navigation";
import { accountList } from "@/app/api/account";
import { useSelector } from "react-redux";

export const WorkspaceSelection: React.FC = () => {
  const [options, setOptions] = useState<{ label: string | JSX.Element; value: string; }[]>([]);
  const { workspaces } = useWorkspaces();
  const dispatch = useDispatch();
  const router = useRouter();
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  
  const handleChange = (value: string | undefined) => {
    if (!value) {
      router.push(`/workspace`);
    } else {
      const w = workspaces.find(item => (item.id === value));
      if (currentWorkspace?.id !== w?.id) {
        dispatch(setCurrentWorkspace(w));
      }
      router.push(`/workspace/${value}`);
    }
  }
  
  useEffect(() => {
    if (workspaces) {
      const opt = workspaces?.map(item => ({label: item.name, value: item.id}));
      setOptions(opt);
      if (!currentWorkspace) {
        dispatch(setCurrentWorkspace(workspaces[0]));
        router.push(`/workspace/${workspaces[0]?.id}`);
      }
    } 
  }, [workspaces]);

  return(
    <Select
      style={{minWidth: "100px"}}
      showSearch
      placeholder="Select a workspace"
      value={currentWorkspace?.id}
      optionFilterProp="label"
      onChange={handleChange}
      options={options}
      notFoundContent={workspaces.length === 0 ? "No workspaces available" : "No match found"}
    />
  )
}

export const UserSelection: React.FC = () => {
  const { workspaceId, boardId } = useParams();
  const [options, setOptions] = useState<{ label: JSX.Element; value: string; }[]>([]);
  
  const handleChange = (value: string | undefined) => {
    
  }

  useEffect(() => {
    const fecthData = async() => {
        const wsId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
        const bId = Array.isArray(boardId) ? boardId[0] : boardId;
        const result = await accountList(wsId, bId);
        console.log(result);

        if (result && result.data) {
          const opt = result?.data?.map(item => ({
            value: item.id, 
            label:
              <div className="flex justify-start items-center gap-3">
                <Avatar size={20} className="bg-blue-50 text-blue-500 border border-blue-100">
                  {item.username?.substring(0, 2)?.toUpperCase()}
                </Avatar>
                <Typography.Text>{item.username}</Typography.Text>
              </div>
          }));
          setOptions(opt);
        }
      }

    fecthData();

  }, [])
  

  return(
    <Select
      showSearch
      placeholder="Select a user"
      optionFilterProp="label"
      onChange={handleChange}
      options={options}
      notFoundContent={options.length === 0 ? "No user available" : "No match found"}
      className="w-full"
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