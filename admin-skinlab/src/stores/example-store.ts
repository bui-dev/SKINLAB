"use client";

import { create } from "zustand";

type ExampleStore = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

export type ExampleStoreSelector<T> = (state: ExampleStore) => T;

const useExampleStore = create<ExampleStore>((set) => ({
  enabled: false,
  setEnabled: (enabled) => set({ enabled }),
}));

export function useExampleStoreSelector<T>(
  selector: ExampleStoreSelector<T>,
): T {
  return useExampleStore(selector);
}

export const selectExampleEnabled: ExampleStoreSelector<boolean> = (state) =>
  state.enabled;
export const selectSetExampleEnabled: ExampleStoreSelector<
  ExampleStore["setEnabled"]
> = (state) => state.setEnabled;
