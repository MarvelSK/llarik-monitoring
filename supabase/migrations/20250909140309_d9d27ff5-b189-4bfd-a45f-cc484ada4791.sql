-- Create a test admin user
-- First, we need to insert into auth.users (this requires special permissions)
-- Let's create a profile entry that will allow the user to be created through the auth system

-- Insert a profile for the test user with admin privileges
-- We'll use a specific UUID that we can reference
INSERT INTO public.profiles (id, name, email, is_admin, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Test Admin',
  'test@test.com',
  true,
  now()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  is_admin = EXCLUDED.is_admin;