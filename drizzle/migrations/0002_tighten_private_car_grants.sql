REVOKE ALL ON public.car_account_data FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_account_data TO authenticated;
GRANT ALL ON public.car_account_data TO service_role;
REVOKE ALL ON public.receipt_ai_guard FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.receipt_ai_guard TO service_role;