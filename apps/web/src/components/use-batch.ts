"use client";

import { useCallback, useEffect, useState } from "react";
import { addToBatch, loadBatch, notifyBatchChanged, onBatchChanged, removeFromBatch } from "@/lib/batch-storage";

/** The records the owner is putting together for one Facebook post, kept on the phone and shared by every part of the page. */
export function useBatch() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => {
      setIds(loadBatch(localStorage));
    };
    sync();
    return onBatchChanged(sync);
  }, []);

  const add = useCallback((id: string) => {
    addToBatch(localStorage, id);
    notifyBatchChanged();
  }, []);

  const remove = useCallback((id: string) => {
    removeFromBatch(localStorage, id);
    notifyBatchChanged();
  }, []);

  return { ids, add, remove };
}
