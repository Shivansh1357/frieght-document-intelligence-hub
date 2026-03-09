"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DocumentListResponse, DocumentDetail } from "@/lib/types";

export function useDocuments(params?: URLSearchParams) {
  return useQuery<DocumentListResponse>({
    queryKey: ["documents", params?.toString()],
    queryFn: () => api.documents.list(params),
  });
}

export function useDocument(id: string) {
  return useQuery<DocumentDetail>({
    queryKey: ["document", id],
    queryFn: () => api.documents.get(id),
    enabled: !!id,
  });
}

export function useDocumentCorrections(id: string) {
  return useQuery({
    queryKey: ["document-corrections", id],
    queryFn: () => api.documents.corrections(id),
    enabled: !!id,
  });
}
