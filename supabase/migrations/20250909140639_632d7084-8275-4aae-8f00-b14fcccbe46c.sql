-- Make bdforestbd@gmail.com an admin
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'bdforestbd@gmail.com';