CREATE TABLE public.car_account_data (
 user_id uuid PRIMARY KEY,
 state jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_account_data TO authenticated;
GRANT ALL ON public.car_account_data TO service_role;
ALTER TABLE public.car_account_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_car_select ON public.car_account_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_car_insert ON public.car_account_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_car_update ON public.car_account_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_car_delete ON public.car_account_data FOR DELETE TO authenticated USING (auth.uid() = user_id);
COMMENT ON TABLE public.car_account_data IS 'Atomic validated car state per account; optimistic revisions prevent cross-device overwrites.';