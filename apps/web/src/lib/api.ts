import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  MetricsResponse,
  FluidCreateRequest,
  FluidEntryResponse,
  FluidDeleteResponse,
  MealCreateRequest,
  MealEntryResponse,
  MealDeleteResponse,
  WeightCreateRequest,
  WeightEntryResponse,
  DoseConfirmRequest,
  DoseConfirmResponse,
  SymptomCreateRequest,
  SymptomEntryResponse,
  AlertsLatestResponse,
  VoiceTranscribeResponse,
  VoiceIntentRequest,
  VoiceIntentResponse,
  VoiceConfirmRequest,
  VoiceConfirmResponse,
  TtsRequest,
  TtsResponse,
  FamilySettingsResponse,
  FamilySettingsUpdateRequest,
  FamilySettingsUpdateResponse,
  FamilySummarySendResponse,
  ReportSendResponse,
  UiFlagsResponse,
  UiFlagsUpdateRequest,
  UiFlagsUpdateResponse,
  DemoResetResponse,
} from '@ventra/core';
import { getMockMetrics } from './mock-data';

const isMockApi =
  import.meta.env.VITE_MOCK_API === 'true' ||
  (typeof process !== 'undefined' && process.env.VITEST === 'true');

let mockSession = false;

function unauthorized(): Error {
  const err = new Error('Session required');
  (err as Error & { status?: number }).status = 401;
  return err;
}

function mockResponse(path: string, init?: RequestInit): unknown {
  if (path === '/api/auth/login') {
    mockSession = true;
    return { ok: true } satisfies LoginResponse;
  }
  if (path === '/api/auth/logout') {
    mockSession = false;
    return { ok: true } satisfies LogoutResponse;
  }
  if (path === '/api/me') {
    if (!mockSession) throw unauthorized();
    return { name: 'Mdm Tan', is_demo: true };
  }
  if (path.startsWith('/api/metrics')) {
    if (!mockSession) throw unauthorized();
    return getMockMetrics();
  }
  if (path === '/api/fluid') {
    if (!mockSession) throw unauthorized();
    if (init?.method === 'POST') {
      const body = JSON.parse((init.body as string) || '{}') as FluidCreateRequest;
      return { id: 1, date: '2026-10-07', time: '3:00 PM', what: body.what, ml: body.ml } satisfies FluidEntryResponse;
    }
    return {
      entries: [
        { id: 1, date: '2026-10-07', time: '3:00 PM', what: 'Water', ml: 300 },
      ],
    };
  }
  if (path === '/api/fluid/last') {
    if (!mockSession) throw unauthorized();
    return { ok: true, deletedId: 1 } satisfies FluidDeleteResponse;
  }
  if (path === '/api/meals') {
    if (!mockSession) throw unauthorized();
    if (init?.method === 'POST') {
      const body = JSON.parse((init.body as string) || '{}') as MealCreateRequest;
      return {
        id: 1,
        date: '2026-10-07',
        time: '6:30 PM',
        meal: body.meal,
        what: body.what,
        sodiumMg: body.sodiumMg,
        kcal: body.kcal,
        potassiumMg: body.potassiumMg,
        phosphorusMg: body.phosphorusMg,
        carbsJson: JSON.stringify(body.carbs),
        proteinJson: JSON.stringify(body.protein),
        fatJson: JSON.stringify(body.fat),
        plateJson: JSON.stringify(body.plate),
        tip: body.tip,
      } satisfies MealEntryResponse;
    }
    return { ok: true };
  }
  if (path === '/api/meals/last') {
    if (!mockSession) throw unauthorized();
    return { ok: true, deletedId: 1 } satisfies MealDeleteResponse;
  }
  if (path === '/api/weight') {
    if (!mockSession) throw unauthorized();
    const body = JSON.parse((init?.body as string) || '{}') as WeightCreateRequest;
    return { id: 1, date: '2026-10-07', weightKg: body.weightKg } satisfies WeightEntryResponse;
  }
  if (path === '/api/doses/confirm') {
    if (!mockSession) throw unauthorized();
    return { ok: true, takenAt: '8:05 AM' } satisfies DoseConfirmResponse;
  }
  if (path === '/api/symptoms') {
    if (!mockSession) throw unauthorized();
    const body = JSON.parse((init?.body as string) || '{}') as SymptomCreateRequest;
    return { id: 1, date: '2026-10-07', key: body.key, sev: body.sev } satisfies SymptomEntryResponse;
  }
  if (path === '/api/alerts/latest') {
    if (!mockSession) throw unauthorized();
    return {
      zone: 'green',
      reasons: [],
      script: [],
    } satisfies AlertsLatestResponse;
  }
  if (path === '/api/voice/transcribe') {
    if (!mockSession) throw unauthorized();
    return { text: 'I drank a cup of tea' } satisfies VoiceTranscribeResponse;
  }
  if (path === '/api/voice/intent') {
    if (!mockSession) throw unauthorized();
    const body = JSON.parse((init?.body as string) || '{}') as VoiceIntentRequest;
    if (body.text.includes('tea')) {
      return { intent: 'log_fluid', params: { what: 'Tea', ml: 250 } } satisfies VoiceIntentResponse;
    }
    return { intent: 'unknown' } satisfies VoiceIntentResponse;
  }
  if (path === '/api/voice/confirm') {
    if (!mockSession) throw unauthorized();
    return { ok: true, action: 'Created fluid entry 250 ml Tea' } satisfies VoiceConfirmResponse;
  }
  if (path === '/api/tts') {
    if (!mockSession) throw unauthorized();
    return { url: '/tts-cache/abc123.mp3' } satisfies TtsResponse;
  }
  if (path === '/api/family/settings') {
    if (!mockSession) throw unauthorized();
    if (init?.method === 'PUT') {
      return { ok: true } satisfies FamilySettingsUpdateResponse;
    }
    return { enabled: true, alerts: true, status: true, medicines: true, dailySummary: true } satisfies FamilySettingsResponse;
  }
  if (path === '/api/family/summary/send') {
    if (!mockSession) throw unauthorized();
    return { ok: true, sentAt: new Date().toISOString() } satisfies FamilySummarySendResponse;
  }
  if (path === '/api/report/send') {
    if (!mockSession) throw unauthorized();
    return { ok: true } satisfies ReportSendResponse;
  }
  if (path === '/api/ui-flags') {
    if (!mockSession) throw unauthorized();
    if (init?.method === 'PUT') {
      return { ok: true } satisfies UiFlagsUpdateResponse;
    }
    return {} satisfies UiFlagsResponse;
  }
  if (path === '/api/demo/reset') {
    if (!mockSession) throw unauthorized();
    return { ok: true } satisfies DemoResetResponse;
  }
  return { ok: true };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (isMockApi) {
    return Promise.resolve(mockResponse(path, init) as T);
  }

  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: 'Request failed' } }));
    const err = new Error(body.error?.message || 'Request failed');
    (err as Error & { code?: string }).code = body.error?.code || 'UNKNOWN';
    throw err;
  }

  return res.json();
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

export function useMe() {
  return useQuery<{ name: string; is_demo: boolean }>({
    queryKey: ['me'],
    queryFn: () => apiFetch('/api/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (body) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation<LogoutResponse, Error, void>({
    mutationFn: () => apiFetch('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.removeQueries();
    },
  });
}

/* ------------------------------------------------------------------ */
/* Metrics                                                            */
/* ------------------------------------------------------------------ */

export function useMetrics(date?: string) {
  return useQuery<MetricsResponse>({
    queryKey: ['metrics', date],
    queryFn: () => apiFetch(`/api/metrics${date ? `?date=${date}` : ''}`),
  });
}

/* ------------------------------------------------------------------ */
/* Fluid                                                              */
/* ------------------------------------------------------------------ */

export function useFluid() {
  return useQuery<{ entries: FluidEntryResponse[] }>({
    queryKey: ['fluid'],
    queryFn: () => apiFetch('/api/fluid'),
  });
}

export function useAddFluid() {
  const qc = useQueryClient();
  return useMutation<FluidEntryResponse, Error, FluidCreateRequest>({
    mutationFn: (body) => apiFetch('/api/fluid', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fluid'] });
      qc.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

export function useDeleteLastFluid() {
  const qc = useQueryClient();
  return useMutation<FluidDeleteResponse, Error, void>({
    mutationFn: () => apiFetch('/api/fluid/last', { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fluid'] });
      qc.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Meals                                                              */
/* ------------------------------------------------------------------ */

export function useAddMeal() {
  const qc = useQueryClient();
  return useMutation<MealEntryResponse, Error, MealCreateRequest>({
    mutationFn: (body) => apiFetch('/api/meals', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metrics'] }),
  });
}

export function useDeleteLastMeal() {
  const qc = useQueryClient();
  return useMutation<MealDeleteResponse, Error, void>({
    mutationFn: () => apiFetch('/api/meals/last', { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metrics'] }),
  });
}

/* ------------------------------------------------------------------ */
/* Weight                                                             */
/* ------------------------------------------------------------------ */

export function useAddWeight() {
  const qc = useQueryClient();
  return useMutation<WeightEntryResponse, Error, WeightCreateRequest>({
    mutationFn: (body) => apiFetch('/api/weight', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metrics'] }),
  });
}

/* ------------------------------------------------------------------ */
/* Doses                                                              */
/* ------------------------------------------------------------------ */

export function useConfirmDose() {
  const qc = useQueryClient();
  return useMutation<DoseConfirmResponse, Error, DoseConfirmRequest>({
    mutationFn: (body) => apiFetch('/api/doses/confirm', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metrics'] }),
  });
}

/* ------------------------------------------------------------------ */
/* Symptoms                                                           */
/* ------------------------------------------------------------------ */

export function useAddSymptom() {
  const qc = useQueryClient();
  return useMutation<SymptomEntryResponse, Error, SymptomCreateRequest>({
    mutationFn: (body) => apiFetch('/api/symptoms', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metrics'] }),
  });
}

/* ------------------------------------------------------------------ */
/* Alerts                                                             */
/* ------------------------------------------------------------------ */

export function useLatestAlert() {
  return useQuery<AlertsLatestResponse>({
    queryKey: ['alerts', 'latest'],
    queryFn: () => apiFetch('/api/alerts/latest'),
    retry: false,
  });
}

/* ------------------------------------------------------------------ */
/* Voice                                                              */
/* ------------------------------------------------------------------ */

export function useTranscribeVoice() {
  return useMutation<VoiceTranscribeResponse, Error, FormData>({
    mutationFn: (formData) => apiFetch('/api/voice/transcribe', { method: 'POST', body: formData }),
  });
}

export function useParseVoiceIntent() {
  return useMutation<VoiceIntentResponse, Error, VoiceIntentRequest>({
    mutationFn: (body) => apiFetch('/api/voice/intent', { method: 'POST', body: JSON.stringify(body) }),
  });
}

export function useConfirmVoiceAction() {
  return useMutation<VoiceConfirmResponse, Error, VoiceConfirmRequest>({
    mutationFn: (body) => apiFetch('/api/voice/confirm', { method: 'POST', body: JSON.stringify(body) }),
  });
}

/* ------------------------------------------------------------------ */
/* TTS                                                                */
/* ------------------------------------------------------------------ */

export function useTts() {
  return useMutation<TtsResponse, Error, TtsRequest>({
    mutationFn: (body) => apiFetch('/api/tts', { method: 'POST', body: JSON.stringify(body) }),
  });
}

/* ------------------------------------------------------------------ */
/* Family                                                             */
/* ------------------------------------------------------------------ */

export function useFamilySettings() {
  return useQuery<FamilySettingsResponse>({
    queryKey: ['family', 'settings'],
    queryFn: () => apiFetch('/api/family/settings'),
  });
}

export function useUpdateFamilySettings() {
  const qc = useQueryClient();
  return useMutation<FamilySettingsUpdateResponse, Error, FamilySettingsUpdateRequest>({
    mutationFn: (body) => apiFetch('/api/family/settings', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family', 'settings'] }),
  });
}

export function useSendFamilySummary() {
  return useMutation<FamilySummarySendResponse, Error, void>({
    mutationFn: () => apiFetch('/api/family/summary/send', { method: 'POST' }),
  });
}

/* ------------------------------------------------------------------ */
/* Report                                                             */
/* ------------------------------------------------------------------ */

export function useSendReport() {
  return useMutation<ReportSendResponse, Error, void>({
    mutationFn: () => apiFetch('/api/report/send', { method: 'POST' }),
  });
}

/* ------------------------------------------------------------------ */
/* UI Flags                                                           */
/* ------------------------------------------------------------------ */

export function useUiFlags() {
  return useQuery<UiFlagsResponse>({
    queryKey: ['ui-flags'],
    queryFn: () => apiFetch('/api/ui-flags'),
  });
}

export function useSetUiFlag() {
  const qc = useQueryClient();
  return useMutation<UiFlagsUpdateResponse, Error, UiFlagsUpdateRequest>({
    mutationFn: (body) => apiFetch('/api/ui-flags', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ui-flags'] }),
  });
}

/* ------------------------------------------------------------------ */
/* Demo                                                               */
/* ------------------------------------------------------------------ */

export function useDemoReset() {
  const qc = useQueryClient();
  return useMutation<DemoResetResponse, Error, void>({
    mutationFn: () => apiFetch('/api/demo/reset', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries(),
  });
}
