"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** true in the browser, false during server rendering — without a setState-in-effect. */
export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
