import { useQuery } from '@tanstack/react-query';
import { capturesAPI } from './client';

export function useInboxCount() {
  return useQuery<number>({
    queryKey: ['inboxCount'],
    queryFn: async () => {
      const data = await capturesAPI.listUnorganized();
      return Array.isArray(data) ? data.length : 0;
    },
    staleTime: 30_000,
  });
}
