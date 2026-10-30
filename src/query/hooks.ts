import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SonarrError, userMessage } from '../api/errors';
import type { SonarrApi } from '../api/types';
import { connectionIdentity, useConnection } from '../connection/ConnectionProvider';
import { useNotice } from '../ui/Notice';

export const SAMPLE_NOTICE = 'Sample data — nothing was changed.';

export function useSonarrQuery<T>(
  key: unknown[],
  fn: (api: SonarrApi) => Promise<T>,
  opts: { refetchInterval?: number; enabled?: boolean } = {},
): { data?: T; isLoading: boolean; error?: SonarrError; isStale: boolean; refetch(): void } {
  const { state, api } = useConnection();
  const q = useQuery<T, Error>({
    queryKey: [connectionIdentity(state), ...key],
    queryFn: () => fn(api!),
    enabled: api !== null && (opts.enabled ?? true),
    refetchInterval: opts.refetchInterval,
  });
  const error = q.error instanceof SonarrError ? q.error : undefined;
  const isStale =
    q.data !== undefined && error !== undefined && (error.kind === 'unreachable' || error.kind === 'timeout');
  return {
    data: q.data,
    isLoading: q.isLoading,
    error,
    isStale,
    refetch: () => void q.refetch(),
  };
}

export function useSonarrMutation<V>(
  fn: (api: SonarrApi, v: V) => Promise<unknown>,
  opts: { successMessage: string; invalidate: unknown[][] },
): { run(v: V): Promise<void>; isRunning: boolean } {
  const { state, api } = useConnection();
  const client = useQueryClient();
  const notice = useNotice();
  const m = useMutation<unknown, Error, V>({ mutationFn: (v) => fn(api!, v) });
  const { mutateAsync } = m;
  const identity = connectionIdentity(state);
  const { successMessage } = opts;
  const { invalidate } = opts;

  async function run(v: V) {
    try {
      await mutateAsync(v);
      notice.show(state.mode === 'sample' ? SAMPLE_NOTICE : successMessage);
      await Promise.all(invalidate.map((k) => client.invalidateQueries({ queryKey: [identity, ...k] })));
    } catch (e) {
      notice.show(userMessage(e).title);
    }
  }
  return { run, isRunning: m.isPending };
}
