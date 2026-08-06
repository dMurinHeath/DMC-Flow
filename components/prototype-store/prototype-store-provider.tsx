"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  createBrowserPrototypeStorage,
  loadPrototypeState,
  savePrototypeState,
} from "@/lib/prototype-store/persistence";
import { reducePrototypeState } from "@/lib/prototype-store/reducer";
import { createPrototypeSeedState } from "@/lib/prototype-store/seed";
import type {
  PrototypeState,
  PrototypeStorage,
  PrototypeStoreAction,
} from "@/lib/prototype-store/types";

type PrototypeStoreContextValue = {
  state: PrototypeState;
  dispatch: Dispatch<PrototypeStoreAction>;
  hydrated: boolean;
};

type ProviderState = {
  data: PrototypeState;
  hydrated: boolean;
};

type ProviderAction =
  | PrototypeStoreAction
  | { type: "__finish_hydration"; state: PrototypeState };

const PrototypeStoreContext = createContext<PrototypeStoreContextValue | null>(
  null,
);

function reduceProviderState(
  state: ProviderState,
  action: ProviderAction,
): ProviderState {
  if (action.type === "__finish_hydration") {
    return {
      data: reducePrototypeState(state.data, {
        type: "hydrate",
        state: action.state,
      }),
      hydrated: true,
    };
  }

  return {
    data: reducePrototypeState(state.data, action),
    hydrated: state.hydrated,
  };
}

type PrototypeStoreProviderProps = {
  children: ReactNode;
  storage?: PrototypeStorage;
};

export function PrototypeStoreProvider({
  children,
  storage,
}: PrototypeStoreProviderProps) {
  const storageRef = useRef(storage ?? createBrowserPrototypeStorage());
  const [providerState, dispatchProvider] = useReducer(
    reduceProviderState,
    undefined,
    () => ({
      data: createPrototypeSeedState(),
      hydrated: false,
    }),
  );

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      const loaded = loadPrototypeState(storageRef.current);
      dispatchProvider({ type: "__finish_hydration", state: loaded });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!providerState.hydrated) {
      return;
    }
    savePrototypeState(storageRef.current, providerState.data);
  }, [providerState.hydrated, providerState.data]);

  const dispatch = useCallback<Dispatch<PrototypeStoreAction>>((action) => {
    dispatchProvider(action);
  }, []);

  const value = useMemo(
    () => ({
      state: providerState.data,
      dispatch,
      hydrated: providerState.hydrated,
    }),
    [providerState.data, providerState.hydrated, dispatch],
  );

  return (
    <PrototypeStoreContext.Provider value={value}>
      {children}
    </PrototypeStoreContext.Provider>
  );
}

export function usePrototypeStore(): PrototypeStoreContextValue {
  const value = useContext(PrototypeStoreContext);
  if (!value) {
    throw new Error("usePrototypeStore must be used within PrototypeStoreProvider");
  }
  return value;
}
