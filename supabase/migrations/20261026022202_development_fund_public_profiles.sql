begin;
-- New reports publish donor profiles only after operator confirmation.
-- Legacy private rows remain private; no data is rewritten.
CREATE OR REPLACE FUNCTION app_private.development_fund_submit(p_id uuid, p_depositor_name text, p_reported_won integer, p_remitted_at timestamp with time zone, p_message text DEFAULT ''::text, p_public_profile boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); r app_private.island_fund_reports;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_id is null or p_depositor_name is null or char_length(btrim(p_depositor_name)) not between 1 and 40
  or p_reported_won is null or p_reported_won not between 1 and 1000000000 or p_remitted_at is null or not isfinite(p_remitted_at)
  or p_remitted_at>clock_timestamp()+interval '10 minutes' or p_message is null or char_length(p_message)>200 or p_public_profile is null
 then raise exception 'INVALID_FUND_REPORT';end if;
 -- Serialize an owner's submissions without touching a game wallet or granting
 -- any game currency. Replayed IDs remain stable after operator review too.
 perform 1 from public.player_profiles where id=u for update;
 if not found then raise exception 'FUND_PROFILE_REQUIRED';end if;
 select * into r from app_private.island_fund_reports where id=p_id;
 if found then
  if r.user_id is distinct from u or r.depositor_name<>btrim(p_depositor_name) or r.reported_won<>p_reported_won
   or r.remitted_at<>p_remitted_at or r.message<>btrim(p_message) then raise exception 'OPERATION_CONFLICT';end if;
  return app_private.development_fund_report_payload(r);
 end if;
 if (select count(*) from app_private.island_fund_reports where user_id=u and created_at>clock_timestamp()-interval '1 day')>=20 then raise exception 'FUND_REPORT_LIMIT';end if;
 insert into app_private.island_fund_reports(id,user_id,depositor_name,reported_won,remitted_at,message,public_profile)
 values(p_id,u,btrim(p_depositor_name),p_reported_won,p_remitted_at,btrim(p_message),true) returning * into r;
 return app_private.development_fund_report_payload(r);
end $function$;

notify pgrst,'reload schema';
commit;
