REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO service_role;