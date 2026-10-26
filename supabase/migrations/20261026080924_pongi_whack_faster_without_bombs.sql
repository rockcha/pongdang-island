begin;
create or replace function app_private.pongi_whack_board()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare board jsonb:='[]'; free integer[]:=array[0,0,0,0,0,0,0,0,0];
 t integer:=500; slot integer; choices integer[]; kind text; roll double precision;
 golden_at integer:=5000+floor(random()*21000)::integer; golden boolean:=false; deadline integer; n integer:=0;
begin
 while t<29000 loop
  select array_agg(i) into choices from generate_series(1,9) i where free[i]<=t;
  if cardinality(choices)>0 then
   slot:=choices[1+floor(random()*cardinality(choices))::integer]; roll:=random();
   kind:=case when not golden and t>=golden_at then 'golden'
    when roll<case when t<10000 then 0.16 when t<20000 then 0.28 else 0.40 end
     then case when random()<0.5 then 'impostor' else 'hay' end else 'pongi' end;
   if kind='golden' then golden:=true;end if;
   deadline:=least(30000,t+case when kind='golden' then 1000 else round(1100-500*least(1,t/30000.0))::integer end);
   board:=board||jsonb_build_array(jsonb_build_object('id',n,'hole',slot-1,'at',t,'until',deadline,'kind',kind));
   free[slot]:=deadline+100;n:=n+1;
  end if;
  t:=t+case when t<10000 then 600 when t<20000 then 420 else 300 end;
 end loop;
 return board;
end $function$;
notify pgrst,'reload schema';
commit;
