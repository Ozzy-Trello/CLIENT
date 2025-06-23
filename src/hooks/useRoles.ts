import { useEffect, useState } from 'react';
import { getRoles } from '@api/role';
import { Role } from '@myTypes/role';

export const useRoles = (workspaceId: string) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!workspaceId) return;
      
      setLoading(true);
      try {
        const response = await getRoles(workspaceId);
        if (response.data) {
          setRoles(response.data);
        }
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching roles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [workspaceId]);

  return { roles, loading, error };
};
