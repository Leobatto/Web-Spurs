DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'role' AND e.enumlabel = 'player'
  ) THEN
    EXECUTE 'ALTER TYPE "role" RENAME VALUE ''player'' TO ''read''';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'role' AND e.enumlabel = 'write'
  ) THEN
    EXECUTE 'ALTER TYPE "role" ADD VALUE ''write'' AFTER ''admin''';
  END IF;
END $$;

ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'read';
