CREATE OR REPLACE FUNCTION public.persist_rotation()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bucket bigint := floor(extract(epoch from now()) / 21600);
  keys text[];
BEGIN
  IF EXISTS (SELECT 1 FROM public.shop_rotation_history h WHERE h.bucket = v_bucket) THEN
    RETURN;
  END IF;
  SELECT array_agg(r.item_key) INTO keys FROM public.get_shop_rotation() r;
  INSERT INTO public.shop_rotation_history (bucket, item_keys) VALUES (v_bucket, keys)
    ON CONFLICT DO NOTHING;
END;
$function$;