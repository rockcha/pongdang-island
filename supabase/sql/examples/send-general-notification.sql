-- SQL Editor / trusted backend only. Replace the UUID before executing.
-- Users must have completed nickname setup and opened the app once after schema installation.
insert into public.notifications(recipient_id,category,kind,title,body)
values ('00000000-0000-0000-0000-000000000000'::uuid, 'general', 'announcement',
  '퐁당섬에서 소식이 도착했어요', '새로운 낚시 여행을 준비하고 있어요.');
-- Production: a trusted server may insert one row per recipient with service-role credentials.
-- Never grant INSERT to authenticated clients, and never expose a service-role key in VITE_*.
