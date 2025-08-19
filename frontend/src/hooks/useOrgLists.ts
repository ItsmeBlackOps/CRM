import { useQuery } from '@tanstack/react-query';
import { emitAndWait } from '@/lib/socketClient';
import { ListsData } from '@/types';
import { useAuth } from '@/contexts/auth';

export function useOrgLists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['orgLists', user?.branchId, user?.departmentId],
    queryFn: () =>
      emitAndWait<unknown, ListsData>(
        'lists:bootstrap',
        {},
        'lists:data',
      ),
    staleTime: 10 * 60 * 1000,
    enabled: !!user,
  });
}
