-- Add missing columns to tip_produs to match remote schema
ALTER TABLE public.tip_produs 
  ADD COLUMN IF NOT EXISTS tipprodus_cod text,
  ADD COLUMN IF NOT EXISTS countproduse integer,
  ADD COLUMN IF NOT EXISTS tipprodusmain_descr text;

-- Change tipprodus_level to text type and add check constraint
ALTER TABLE public.tip_produs 
  ALTER COLUMN tipprodus_level TYPE text USING tipprodus_level::text;

ALTER TABLE public.tip_produs 
  ALTER COLUMN tipprodus_level SET NOT NULL;

-- Add check constraint for tipprodus_level (drop if exists first)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tip_produs_tipprodus_level_check') THEN
    ALTER TABLE public.tip_produs DROP CONSTRAINT tip_produs_tipprodus_level_check;
  END IF;
END $$;

ALTER TABLE public.tip_produs 
  ADD CONSTRAINT tip_produs_tipprodus_level_check CHECK (tipprodus_level = ANY (ARRAY['Main'::text, 'Sub'::text]));

-- Make tipprodus_descriere not null
ALTER TABLE public.tip_produs 
  ALTER COLUMN tipprodus_descriere SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tip_produs_level ON public.tip_produs USING btree (tipprodus_level);
CREATE INDEX IF NOT EXISTS idx_tip_produs_main_id ON public.tip_produs USING btree (tipprodusmain_id);