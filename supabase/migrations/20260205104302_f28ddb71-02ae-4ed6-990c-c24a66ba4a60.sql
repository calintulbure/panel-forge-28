-- Create processing queue table for tracking resource and document processing
CREATE TABLE public.processing_queue (
  queue_id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('resource', 'document')),
  entity_id INTEGER NOT NULL,
  erp_product_code TEXT,
  articol_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  processing_log TEXT,
  error_message TEXT,
  n8n_workflow_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_processing_queue_entity_type ON public.processing_queue(entity_type);
CREATE INDEX idx_processing_queue_status ON public.processing_queue(status);
CREATE INDEX idx_processing_queue_erp_product_code ON public.processing_queue(erp_product_code);
CREATE INDEX idx_processing_queue_articol_id ON public.processing_queue(articol_id);
CREATE INDEX idx_processing_queue_created_at ON public.processing_queue(created_at DESC);
CREATE INDEX idx_processing_queue_entity_id ON public.processing_queue(entity_id);

-- Enable RLS
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins and operators can view processing_queue"
ON public.processing_queue FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can insert processing_queue"
ON public.processing_queue FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can update processing_queue"
ON public.processing_queue FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins can delete processing_queue"
ON public.processing_queue FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_processing_queue_updated_at
BEFORE UPDATE ON public.processing_queue
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();