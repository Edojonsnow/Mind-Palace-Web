import type { components } from "@/generated/api";

type Schemas = components["schemas"];

export type ThoughtType = Schemas["ThoughtType"];
export type Thought = Schemas["ThoughtRead"];
export type ThoughtMetadata = Schemas["ThoughtMetadataRead"];

export type ThoughtListOptions = {
  q?: string;
  thought_type?: string;
  source_type?: string;
  book_id?: string;
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

export type AskSource = Schemas["AskSource"];
export type AskResponse = Schemas["AskResponse"];

export type AskMessage = Omit<Schemas["ChatMessageRead"], "role" | "citations"> & {
  role: "user" | "assistant";
  citations: AskSource[];
};

export type AskConversation = Omit<Schemas["ChatConversationRead"], "messages"> & {
  messages: AskMessage[];
};

export type UserSettings = Schemas["UserSettingsRead"];

export type RememberItem = Schemas["RememberItem"];

export type RememberCategory = Omit<Schemas["RememberCategory"], "key"> & {
  key: "themes" | "emotions" | "people" | "books";
};

export type RememberOverview = Omit<Schemas["RememberOverview"], "categories"> & {
  categories: RememberCategory[];
};

export type Book = Schemas["BookRead"];

export type ExportRequest = Schemas["ExportRequestRead"] & {
  status: "pending" | "processing" | "completed" | "failed" | "expired";
};

export type AccountDeletionRequest = Schemas["AccountDeletionRequestRead"] & {
  status: "pending" | "cancelled" | "completed" | "failed";
};

export type CreateThoughtInput = Partial<Schemas["ThoughtCreate"]> & {
  body: Schemas["ThoughtCreate"]["body"];
};

export type UpdateThoughtInput = Partial<Schemas["ThoughtUpdate"]>;

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

export function listBooks(token: string, query?: string): Promise<Book[]> {
  const path = query?.trim() ? `/books?q=${encodeURIComponent(query.trim())}` : "/books";
  return request<Book[]>(path, token);
}

export function createBook(token: string, input: { title: string; author: string }): Promise<Book> {
  return request<Book>("/books", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateThought(
  token: string,
  thoughtId: string,
  input: UpdateThoughtInput,
): Promise<Thought> {
  return request<Thought>(`/thoughts/${thoughtId}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteThought(token: string, thoughtId: string): Promise<void> {
  await request<void>(`/thoughts/${thoughtId}`, token, { method: "DELETE" });
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
