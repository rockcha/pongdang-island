-- Future departures use 40 minutes; existing trips retain their departure snapshot.
update public.fishing_vessels set duration_minutes=40 where id='dinghy';
