"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface UploadState {
  progress: number;
  isUploading: boolean;
  error: string | null;
}

export function useUpload() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<UploadState>({
    progress: 0,
    isUploading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearProgressInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setState({ progress: 0, isUploading: true, error: null });

      const formData = new FormData();
      formData.append("file", file);

      // Simulate gradual progress since we can't track real progress
      let currentProgress = 0;
      intervalRef.current = setInterval(() => {
        currentProgress += Math.random() * 8 + 2;
        if (currentProgress > 90) currentProgress = 90;
        setState((prev) => ({
          ...prev,
          progress: Math.round(currentProgress),
        }));
      }, 500);

      const result = await api.documents.upload(formData);

      clearProgressInterval();
      setState((prev) => ({ ...prev, progress: 100 }));

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setState({ progress: 100, isUploading: false, error: null });
    },
    onError: (error: Error) => {
      clearProgressInterval();
      setState({ progress: 0, isUploading: false, error: error.message });
    },
  });

  const upload = useCallback(
    (file: File) => {
      uploadMutation.mutate(file);
    },
    [uploadMutation]
  );

  const reset = useCallback(() => {
    clearProgressInterval();
    setState({ progress: 0, isUploading: false, error: null });
  }, []);

  return {
    ...state,
    upload,
    reset,
    data: uploadMutation.data,
  };
}
