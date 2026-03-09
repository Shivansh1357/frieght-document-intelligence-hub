import type {
  DocumentListResponse,
  DocumentDetail,
  CorrectionResponse,
  AccuracyAnalytics,
  CorrectionStats,
  FieldBreakdownItem,
  ComparisonResult,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const DEFAULT_ORG_ID =
  process.env.NEXT_PUBLIC_ORG_ID || "00000000-0000-0000-0000-000000000001";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Org-Id": DEFAULT_ORG_ID,
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((d) => (typeof d?.detail === "string" ? d.detail : null))
      .catch(() => null);
    throw new Error(detail || `API Error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  documents: {
    list: (params?: URLSearchParams) =>
      fetchApi<DocumentListResponse>(`/documents?${params || ""}`),
    get: (id: string) => fetchApi<DocumentDetail>(`/documents/${id}`),
    upload: (formData: FormData) =>
      fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "X-Org-Id": DEFAULT_ORG_ID,
        },
      }).then((r) => r.json()),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi(`/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi(`/documents/${id}`, { method: "DELETE" }),
    corrections: (id: string) =>
      fetchApi<CorrectionResponse[]>(`/documents/${id}/corrections`),
    checkDuplicate: (hash: string) =>
      fetchApi(`/documents/check-duplicate`, {
        method: "POST",
        body: JSON.stringify({ file_hash: hash }),
      }),
  },
  analytics: {
    accuracy: () => fetchApi<AccuracyAnalytics>("/analytics/accuracy"),
    corrections: () => fetchApi<CorrectionStats>("/analytics/corrections"),
    fieldBreakdown: () => fetchApi<FieldBreakdownItem[]>("/analytics/field-breakdown"),
  },
  comparison: {
    compare: (id1: string, id2: string) =>
      fetchApi<ComparisonResult>(`/comparison/compare/${id1}/${id2}`),
  },
};
