import { useQuery } from '@tanstack/react-query';
import { emitWithAck } from '@/lib/socketClient';
import { ListsData } from '@/types';
import { useAuth } from '@/contexts/auth';

export function useOrgLists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['orgLists', user?.branchId, user?.departmentId],
    queryFn: () => emitWithAck<unknown, ListsData>('lists:bootstrap', {}),
    staleTime: 10 * 60 * 1000,
    enabled: !!user,
  });
}
