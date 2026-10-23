begin;
create or replace function app_private.adopt_suggestion(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_post public.suggestion_posts;v_rewards jsonb;v_count bigint;
begin
 if auth.uid() is null or not app_private.notice_is_operator() then raise exception 'SUGGESTION_OPERATOR_REQUIRED';end if;
 select * into v_post from public.suggestion_posts where id=p_id for update;
 if not found then raise exception 'SUGGESTION_NOT_FOUND';end if;
 if v_post.adopted_at is not null then return to_jsonb(v_post);end if;
 if not exists(select 1 from public.fishing_baits where id='bait_special') then raise exception 'REWARD_UNAVAILABLE';end if;
 insert into public.player_wallets(user_id) values(v_post.author_id) on conflict do nothing;
 select coalesce((inventory->>'bait_special')::bigint,0) into v_count from public.player_wallets where user_id=v_post.author_id for update;
 if v_count>2147483645 then raise exception 'INVENTORY_LIMIT';end if;
 update public.player_wallets set inventory=jsonb_set(inventory,'{bait_special}',to_jsonb((v_count+2)::integer)),updated_at=now() where user_id=v_post.author_id;
 v_rewards:=jsonb_build_object('bait_special',2);
 update public.suggestion_posts set adopted_at=now(),adopted_by=auth.uid(),reward=v_rewards where id=p_id returning * into v_post;
 insert into public.notifications(recipient_id,actor_id,category,kind,title,body)
 values(v_post.author_id,auth.uid(),'general','reward','[운영팀] 아이디어가 채택됐어요!',
  '「'||v_post.title||'」 건의가 채택되어 달빛 진주새우 2개를 지급했어요. 미끼통에서 확인해주세요.');
 return to_jsonb(v_post);
end $$;
notify pgrst,'reload schema';
commit;
