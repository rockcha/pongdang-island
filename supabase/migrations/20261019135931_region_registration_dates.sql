-- Existing registration dates approximate first appearance in migration history.
begin;
alter table public.regions add column created_at timestamptz not null default now();
update public.regions r set created_at=d.registered_at from (values
('pongdang','2026-10-16T01:55:06Z'::timestamptz),
('coral','2026-10-16T01:55:06Z'::timestamptz),
('starruins','2026-10-16T01:55:06Z'::timestamptz),
('dreamabyss','2026-10-16T01:55:06Z'::timestamptz),
('mistmoon','2026-10-16T01:55:06Z'::timestamptz),
('primal','2026-10-16T12:01:19Z'::timestamptz),
('bluegrove','2026-10-16T15:55:35Z'::timestamptz),
('whitenight','2026-10-17T06:09:59Z'::timestamptz),
('cloudferry','2026-10-17T08:23:26Z'::timestamptz),
('scrapisle','2026-10-17T09:37:23Z'::timestamptz),
('mukhyang','2026-10-18T12:23:29Z'::timestamptz),
('siren','2026-10-19T03:10:38Z'::timestamptz)
) d(id,registered_at) where r.id=d.id;
notify pgrst, 'reload schema';
commit;
