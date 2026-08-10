CREATE OR REPLACE FUNCTION public.enforce_vanguarda_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR lower(NEW.email) NOT LIKE '%@vanguardamartech.com.br' THEN
    RAISE EXCEPTION 'Apenas e-mails @vanguardamartech.com.br podem acessar esta ferramenta.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_vanguarda_email_trigger ON auth.users;
CREATE TRIGGER enforce_vanguarda_email_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_vanguarda_email();