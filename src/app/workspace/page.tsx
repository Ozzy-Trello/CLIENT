'use client';
import React, { useEffect, useState } from "react";
import { Workspace } from "../dto/types";

const WorkspacePage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isFetching, setIsFetching] = useState(true);
 
  const [filter, setFilter] = useState({
    sortBy: "",
    filterBy: "",
    searchKeyword: ""
  });

  // Simulate fetching completion after component mounts
  useEffect(() => {
    const fetchWorkspace = async() => {
      // const result = await useWorkspaces().mutateAsync();
      // if (result && result?.data) {
      //   setWorkspaces(result?.data);
      // }
    }

    fetchWorkspace();
    setIsFetching(false);
  }, [workspaces]);

  return (
    <div className="p-6 h-full overflow-y-auto">
      
      <h1 className="text-2xl font-bold mb-6 m-0">Workspace</h1>
     
      <div className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {!isFetching && workspaces?.map((workspace, index) => {
            return (
              <div
                key={`workspace-${index}`}
                className="col-span-1"
              >
                <div
                  className="bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  style={{
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    height: '120px',
                  }}
                >
                  <div className="flex flex-col justify-between items-start h-full w-full p-4">
                    <h3 className="text-xl font-bold m-0">{workspace.name}</h3>
                    <p className="text-gray-600">{workspace.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
          
          {isFetching && Array.from({ length: 5 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="col-span-1">
              <div className="bg-gray-200 animate-pulse h-[120px] rounded-lg m-1">
                <div className="h-full w-full p-4">
                  <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkspacePage;