-- Rename legacy nickname columns to username columns for wa_users.
-- This preserves existing data while removing the old field names.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wa_users'
      AND column_name = 'nickname'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wa_users'
      AND column_name = 'username'
  ) THEN
    ALTER TABLE public.wa_users RENAME COLUMN nickname TO username;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wa_users'
      AND column_name = 'nickname_edit_count'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wa_users'
      AND column_name = 'username_edit_count'
  ) THEN
    ALTER TABLE public.wa_users RENAME COLUMN nickname_edit_count TO username_edit_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wa_users'
      AND column_name = 'username'
  ) THEN
    ALTER TABLE public.wa_users ALTER COLUMN username SET DEFAULT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wa_users'
      AND column_name = 'username_edit_count'
  ) THEN
    ALTER TABLE public.wa_users ALTER COLUMN username_edit_count SET DEFAULT 0;
  END IF;
END
$$;
