UPDATE public.staff SET square_team_member_id = CASE name
  WHEN 'Johana' THEN 'TM4QDmfdY23nWhtA'
  WHEN 'Ana' THEN 'TMEufvRTli3Vh9HL'
  WHEN 'Zuly' THEN 'TM-rDhAM5n_ar-GW'
  WHEN 'Angie' THEN 'ShDe3BF60vvaw3NsNBdY'
  WHEN 'Mary' THEN 'TMeKUTSS5hLTBvlE'
END WHERE active=true AND square_team_member_id IS NULL;