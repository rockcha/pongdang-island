begin;
insert into public.fishing_rods(id,name,price,region_id,failure_reduction_bp,native_bonus_bp)
values ('mukhyang','여백을 긋는 붓',1500,'mukhyang',200,200)
on conflict(id) do update set name=excluded.name,price=excluded.price,region_id=excluded.region_id,failure_reduction_bp=excluded.failure_reduction_bp,native_bonus_bp=excluded.native_bonus_bp;
notify pgrst, 'reload schema';
commit;
