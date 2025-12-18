-- Create local tip_produs table mirroring remote structure (without foreign keys initially)
CREATE TABLE public.tip_produs (
  tipprodus_id SERIAL PRIMARY KEY,
  tipprodus_descriere TEXT NOT NULL,
  tipprodus_level VARCHAR(10) DEFAULT 'Main',
  tipprodusmain_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tip_produs ENABLE ROW LEVEL SECURITY;

-- RLS policies for admins and operators
CREATE POLICY "Admins and operators can view tip_produs"
ON public.tip_produs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can insert tip_produs"
ON public.tip_produs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins and operators can update tip_produs"
ON public.tip_produs FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins can delete tip_produs"
ON public.tip_produs FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_tip_produs_updated_at
BEFORE UPDATE ON public.tip_produs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();