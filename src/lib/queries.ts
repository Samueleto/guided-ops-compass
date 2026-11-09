import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { ActivityQuery, DomainQuery } from "./api/types";
import { useMode } from "./mode";

export function useOverview() {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "overview"], queryFn: () => api.overview(), refetchInterval: 3000 });
}
export function useDomains(q: DomainQuery) {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "domains", q], queryFn: () => api.listDomains(q), refetchInterval: 5000 });
}
export function useAllDomains() {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "domains", "all"], queryFn: () => api.allDomains(), refetchInterval: 5000 });
}
export function useDomain(name: string) {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "domain", name], queryFn: () => api.getDomain(name), refetchInterval: 4000 });
}
export function useJob(id?: string) {
  const mode = useMode();
  return useQuery({
    queryKey: [mode, "job", id],
    queryFn: () => api.getJob(id!),
    enabled: !!id,
    refetchInterval: (q) => {
      const s = q.state.data?.state;
      return s === "completed" || s === "failed" || s === "cancelled" ? false : 1000;
    },
  });
}
export function useKuma() {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "kuma"], queryFn: () => api.kumaStatus() });
}
export function useSchedules() {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "schedules"], queryFn: () => api.listSchedules(), refetchInterval: 5000 });
}
export function useRotationHistory() {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "runs"], queryFn: () => api.rotationHistory(), refetchInterval: 5000 });
}
export function useActivity(q: ActivityQuery) {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "activity", q], queryFn: () => api.activity(q), refetchInterval: 5000 });
}
export function useSettings() {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "settings"], queryFn: () => api.settings() });
}
export function useNextNumber() {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "next-number"], queryFn: () => api.nextNumber() });
}
export function useConversations() {
  const mode = useMode();
  return useQuery({ queryKey: [mode, "convs"], queryFn: () => api.conversations() });
}
