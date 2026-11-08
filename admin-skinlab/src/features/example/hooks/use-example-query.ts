"use client";

import { useQuery } from "@tanstack/react-query";

import { getExample } from "@/features/example/api/get-example";
import type { ID } from "@/types";

export function useExampleQuery(id: ID) {
  return useQuery({
    queryKey: ["example", id],
    queryFn: () => getExample(id),
    enabled: id.length > 0,
  });
}
