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
    if (!isClient) return; // Don't run on server side

    console.log("Workspace page redirection debug:", {
      accessToken: !!accessToken,
      defaultWorkspace: defaultWorkspace?.id,
      isLoading,
    });

    if (accessToken) {
      if (defaultWorkspace && !isLoading) {
        console.log("Redirecting to default workspace:", defaultWorkspace.id);
        router.push(`/workspace/${defaultWorkspace.id}/board`);
      } else if (!isLoading) {
        console.log("No default workspace found, staying on workspace page");
      } else {
        console.log("Still loading default workspace...");
      }
    } else {
      console.log("No access token, redirecting to login");
      router.push("/login");
    }
  }, [router, defaultWorkspace, isLoading, accessToken, isClient]);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6 m-0">
        Redirecting to default workspace...
      </h1>
    </div>
  );
};

export default WorkspacePage;
