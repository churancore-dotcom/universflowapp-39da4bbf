REVOKE EXECUTE ON FUNCTION public.is_premium_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_premium_user(uuid) TO authenticated;