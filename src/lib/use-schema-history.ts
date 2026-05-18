"use client";

import { useCallback, useState } from "react";
import type { ClientTopologyState } from "@/lib/types";
import { cloneTopology } from "@/lib/schema-design-extras";

const MAX_HISTORY = 40;

type Stack = {
  past: ClientTopologyState[];
  present: ClientTopologyState;
  future: ClientTopologyState[];
};

export function useSchemaHistory(initial: ClientTopologyState) {
  const [stack, setStack] = useState<Stack>({
    past: [],
    present: initial,
    future: [],
  });

  const mutateTopoSilent = useCallback((fn: (t: ClientTopologyState) => ClientTopologyState) => {
    setStack((s) => ({ ...s, present: cloneTopology(fn(s.present)) }));
  }, []);

  const mutateTopo = useCallback((fn: (t: ClientTopologyState) => ClientTopologyState) => {
    setStack((s) => ({
      past: [...s.past, cloneTopology(s.present)].slice(-MAX_HISTORY),
      present: cloneTopology(fn(s.present)),
      future: [],
    }));
  }, []);

  const setTopoSilent = useCallback((next: ClientTopologyState) => {
    setStack((s) => ({ ...s, present: cloneTopology(next) }));
  }, []);

  const setTopo = useCallback((next: ClientTopologyState) => {
    setStack((s) => ({
      past: [...s.past, cloneTopology(s.present)].slice(-MAX_HISTORY),
      present: cloneTopology(next),
      future: [],
    }));
  }, []);

  const replaceTopo = useCallback((next: ClientTopologyState, reset = false) => {
    setStack((s) => ({
      past: reset ? [] : s.past,
      present: cloneTopology(next),
      future: reset ? [] : s.future,
    }));
  }, []);

  const undo = useCallback(() => {
    setStack((s) => {
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        present: cloneTopology(prev),
        future: [cloneTopology(s.present), ...s.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setStack((s) => {
      if (!s.future.length) return s;
      const [next, ...rest] = s.future;
      return {
        past: [...s.past, cloneTopology(s.present)],
        present: cloneTopology(next),
        future: rest,
      };
    });
  }, []);

  const pushHistoryBaseline = useCallback((baseline: ClientTopologyState) => {
    setStack((s) => ({
      past: [...s.past, cloneTopology(baseline)].slice(-MAX_HISTORY),
      present: cloneTopology(s.present),
      future: [],
    }));
  }, []);

  return {
    topo: stack.present,
    setTopo,
    setTopoSilent,
    mutateTopo,
    mutateTopoSilent,
    replaceTopo,
    pushHistoryBaseline,
    undo,
    redo,
    canUndo: stack.past.length > 0,
    canRedo: stack.future.length > 0,
  };
}
