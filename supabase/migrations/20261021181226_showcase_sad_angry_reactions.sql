begin;
alter table public.fishing_showcase_reactions drop constraint fishing_showcase_reactions_reaction_check;
alter table public.fishing_showcase_reactions add constraint fishing_showcase_reactions_reaction_check
 check (reaction in ('celebrate','love','wow','luck','sad','angry'));

create or replace function app_private.react_fishing_showcase(p_post_id uuid,p_reaction text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.fishing_showcase_posts;u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_reaction is not null and p_reaction not in ('celebrate','love','wow','luck','sad','angry') then raise exception 'INVALID_SHOWCASE_REACTION';end if;
 select * into p from public.fishing_showcase_posts where id=p_post_id for share;
 if not found then raise exception 'SHOWCASE_NOT_FOUND';end if;
 perform pg_advisory_xact_lock(hashtextextended('showcase-react:'||p_post_id::text||':'||u::text,0));
 if p_reaction is null then delete from public.fishing_showcase_reactions where post_id=p_post_id and user_id=u;
 else insert into public.fishing_showcase_reactions(post_id,user_id,reaction) values(p_post_id,u,p_reaction)
 on conflict(post_id,user_id) do update set reaction=excluded.reaction;end if;
 return app_private.showcase_post_json(p);
end $$;
commit;
