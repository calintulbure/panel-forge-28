import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface QueueItem {
  queue_id: number;
  entity_type: 'resource' | 'document';
  entity_id: number;
  erp_product_code: string | null;
  articol_id: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  processing_log: string | null;
  error_message: string | null;
  n8n_workflow_id: string | null;
  metadata: Record<string, any>;
  updated_at: string;
}

export interface QueueFilters {
  entity_type?: 'resource' | 'document';
  status?: string | string[];
  erp_product_code?: string;
  articol_id?: number;
}

export interface QueueStats {
  total: number;
  by_entity_type: {
    resource: number;
    document: number;
  };
  by_status: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

export function useProcessingQueue(filters: QueueFilters = {}, limit = 100, offset = 0) {
  return useQuery({
    queryKey: ["processing-queue", filters, limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("processing-queue", {
        body: { action: "list", filters, limit, offset },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return { items: data.data as QueueItem[], count: data.count as number };
    },
  });
}

export function useQueueStats() {
  return useQuery({
    queryKey: ["processing-queue-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("processing-queue", {
        body: { action: "stats" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.stats as QueueStats;
    },
  });
}

export function useEnqueueItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (records: Partial<QueueItem>[]) => {
      const { data, error } = await supabase.functions.invoke("processing-queue", {
        body: { action: "enqueue", records },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["processing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["processing-queue-stats"] });
      toast({
        title: "Items queued",
        description: `${data.count} item(s) added to processing queue`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateQueueStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      queue_ids,
      status,
      processing_log,
      error_message,
    }: {
      queue_ids: number[];
      status: QueueItem['status'];
      processing_log?: string;
      error_message?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("processing-queue", {
        body: { action: "update_status", queue_ids, status, processing_log, error_message },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["processing-queue-stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteQueueItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (queue_ids: number[]) => {
      const { data, error } = await supabase.functions.invoke("processing-queue", {
        body: { action: "delete", queue_ids },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["processing-queue-stats"] });
      toast({
        title: "Items removed",
        description: "Queue items have been deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSyncQueueToRemote() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("processing-queue", {
        body: { action: "sync_to_remote" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Sync complete",
        description: `${data.synced} items synced to remote`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
