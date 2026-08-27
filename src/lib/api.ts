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
};

export type ThoughtListOptions = {
  q?: string;
  thought_type?: string;
  source_type?: string;
  tag?: string;
  book?: string;
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
