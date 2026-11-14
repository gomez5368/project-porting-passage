CREATE TABLE public.receipt_ai_guard (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 day date NOT NULL DEFAULT CURRENT_DATE,
 requests integer NOT NULL DEFAULT 0,
 paused boolean NOT NULL DEFAULT false,
 reason text
);
GRANT ALL ON public.receipt_ai_guard TO service_role;
ALTER TABLE public.receipt_ai_guard ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.reserve_receipt_ai() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE allowed boolean;
BEGIN
 INSERT INTO public.receipt_ai_guard(id) VALUES (true) ON CONFLICT DO NOTHING;
 UPDATE public.receipt_ai_guard SET day = CURRENT_DATE, requests = CASE WHEN day = CURRENT_DATE THEN requests + 1 ELSE 1 END
 WHERE id = true AND NOT paused AND (day <> CURRENT_DATE OR requests < 20)
 RETURNING true INTO allowed;
 RETURN COALESCE(allowed, false);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_receipt_ai() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_receipt_ai() TO service_role;