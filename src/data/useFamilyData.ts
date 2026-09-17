import { useMemo } from "react";
import { people, families } from "./sampleData";
import type { Person, Family } from "./types";

interface FamilyData {
  people: Person[];
  families: Family[];
  isLoading: boolean;
  error: Error | null;
}

export function useFamilyData(): FamilyData {
  return useMemo(
    () => ({ people, families, isLoading: false, error: null }),
    []
  );
}
