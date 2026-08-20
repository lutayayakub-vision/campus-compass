
REVOKE EXECUTE ON FUNCTION public.my_class_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.class_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_class_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.class_of(uuid) TO authenticated;
