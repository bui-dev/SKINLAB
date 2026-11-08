import { apiFetch } from "@/lib/api";
import type { ApiResponse, ID } from "@/types";
import type { Example } from "@/features/example/types/example";

export function getExample(id: ID): Promise<ApiResponse<Example>> {
  return apiFetch<ApiResponse<Example>>(`/examples/${id}`);
}
