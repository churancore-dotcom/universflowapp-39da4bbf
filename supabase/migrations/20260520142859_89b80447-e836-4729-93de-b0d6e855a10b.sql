-- Hide user_id from anonymous reviewers (RLS can't do column filtering)
REVOKE SELECT (user_id) ON public.app_reviews FROM anon;