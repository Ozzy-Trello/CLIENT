"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TokenStorage from "@utils/token-storage";
import { useDefaultWorkspace } from "@hooks/workspace";

const WorkspacePage: React.FC = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const accessToken = isClient ? TokenStorage.getAccessToken() : null;
  const { defaultWorkspace, isLoading } = useDefaultWorkspace();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (defaultWorkspace) {
        router.push(`/workspace/${defaultWorkspace.id}`);
      }
    }
  }, [accessToken, defaultWorkspace, isLoading, router]);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6 m-0">
        Redirecting to default workspace...
      </h1>
    </div>
  );
};

export default WorkspacePage;
