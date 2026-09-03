export type Thought = {
  id: string;
  title: string | null;
  body: string;
  thought_type: string;
  source_type: string;
  source_title: string | null;
  source_author: string | null;
  source_url: string | null;
  book_title: string | null;
  book_author: string | null;
  page_reference: string | null;
  manual_tags: string[];
  storage_scope: string;
  use_with_ask_my_mind: boolean;
  ai_processing_status: "not_requested" | "pending" | "processing" | "ready" | "failed";
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  purge_at: string | null;
  ai_metadata: ThoughtMetadata | null;
};

export type ThoughtMetadata = {
  summary: string | null;
  themes: string[];
  emotions: string[];
  people: string[];
  places: string[];
  books: string[];
  key_questions: string[];
  action_items: string[];
  deterministic_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ThoughtListOptions = {
  q?: string;
  thought_type?: string;
  source_type?: string;
  tag?: string;
  book?: string;
  theme?: string;
  emotion?: string;
  person?: string;
  place?: string;
  is_archived?: boolean;
  created_from?: string;
  created_to?: string;
  page?: number;
  page_size?: number;
};

export type ThoughtListResponse = {
  items: Thought[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AskSource = {
  citation_label: string;
  chunk_id: string;
  thought_id: string;
  title: string | null;
  snippet: string;
  source_type: string;
  source_title: string | null;
  source_author: string | null;
  created_at: string;
  similarity_score: number;
  is_cited: boolean;
};

export type AskResponse = {
  conversation_id: string;
  answer: string;
  sources: AskSource[];
  created_at: string;
};

export type AskMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: AskSource[];
  created_at: string;
};

export type AskConversation = {
  conversation_id: string;
  messages: AskMessage[];
};

export type UserSettings = {
  default_use_with_ask_my_mind: boolean;
  store_chat_history: boolean;
  mobile_offline_cache_enabled: boolean;
};

export type RememberItem = {
  label: string;
  count: number;
};

export type RememberCategory = {
  key: "themes" | "emotions" | "people" | "books";
  label: string;
  items: RememberItem[];
};

export type RememberOverview = {
  thoughts_analyzed: number;
  categories: RememberCategory[];
};

export type ExportRequest = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed" | "expired";
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
};

export type AccountDeletionRequest = {
  id: string;
  status: "pending" | "cancelled" | "completed" | "failed";
  requested_at: string;
  purge_at: string;
  completed_at: string | null;
  error_message: string | null;
};

export type CreateThoughtInput = {
  title?: string;
  body: string;
  thought_type?: string;
  source_type?: string;
  source_title?: string;
  source_author?: string;
  book_title?: string;
  book_author?: string;
  page_reference?: string;
  manual_tags?: string[];
  use_with_ask_my_mind?: boolean;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function requestWithResponse<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<{ data: T; response: Response }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Keep the fallback message when the API returns a non-JSON error.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return { data: undefined as T, response };
  }

  return { data: (await response.json()) as T, response };
}

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const { data } = await requestWithResponse<T>(path, token, options);
  return data;
}

export async function listThoughts(
  token: string,
  options: ThoughtListOptions = {},
): Promise<ThoughtListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const path = params.size > 0 ? `/thoughts?${params.toString()}` : "/thoughts";
  const { data, response } = await requestWithResponse<Thought[]>(path, token);

  return {
    items: data,
    total: Number(response.headers.get("X-Total-Count") ?? data.length),
    page: Number(response.headers.get("X-Page") ?? options.page ?? 1),
    pageSize: Number(response.headers.get("X-Page-Size") ?? options.page_size ?? data.length),
    totalPages: Number(response.headers.get("X-Total-Pages") ?? 1),
  };
}

export function createThought(token: string, input: CreateThoughtInput): Promise<Thought> {
  return request<Thought>("/thoughts", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getSettings(token: string): Promise<UserSettings> {
  return request<UserSettings>("/settings", token);
}

export function getRememberOverview(token: string): Promise<RememberOverview> {
  return request<RememberOverview>("/remember", token);
}

export function organizeThought(token: string, thoughtId: string): Promise<Thought> {
  return request<Thought>(`/thoughts/${thoughtId}/organize`, token, {
    method: "POST",
  });
}

export function updateSettings(
  token: string,
  input: Partial<UserSettings>,
): Promise<UserSettings> {
  return request<UserSettings>("/settings", token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function askMyMind(
  token: string,
  input: { question: string; conversation_id?: string },
): Promise<AskResponse> {
  return request<AskResponse>("/ask", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getAskConversation(
  token: string,
  conversationId: string,
): Promise<AskConversation> {
  return request<AskConversation>(`/ask/${conversationId}`, token);
}

export function listDeletedThoughts(token: string): Promise<Thought[]> {
  return request<Thought[]>('/thoughts/deleted', token);
}

export function restoreThought(token: string, thoughtId: string): Promise<Thought> {
  return request<Thought>(`/thoughts/${thoughtId}/restore`, token, { method: "POST" });
}

export function createExportRequest(token: string): Promise<ExportRequest> {
  return request<ExportRequest>('/exports', token, { method: "POST" });
}

export function getExportRequest(token: string, exportId: string): Promise<ExportRequest> {
  return request<ExportRequest>(`/exports/${exportId}`, token);
}

export async function downloadExport(token: string, exportId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/exports/${exportId}/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Keep the fallback message when the API returns a non-JSON error.
    }
    throw new ApiError(message, response.status);
  }

  return response.blob();
}

export function getAccountDeletionRequest(
  token: string,
): Promise<AccountDeletionRequest | null> {
  return request<AccountDeletionRequest | null>('/account/deletion', token);
}

export function requestAccountDeletion(token: string): Promise<AccountDeletionRequest> {
  return request<AccountDeletionRequest>('/account/deletion', token, { method: "POST" });
}

export function cancelAccountDeletion(token: string): Promise<void> {
  return request<void>('/account/deletion', token, { method: "DELETE" });
}
