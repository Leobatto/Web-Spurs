ALTER TABLE "players" ADD COLUMN "last_name" text;
UPDATE "players"
SET "last_name" = CASE
  WHEN position(',' in trim("name")) > 0 THEN trim(split_part(trim("name"), ',', 1))
  WHEN regexp_replace(trim("name"), '^.*\s+', '') ~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]\.?$' THEN regexp_replace(split_part(regexp_replace(trim("name"), '^#?[0-9]+\s+', ''), ' ', 1), '[.,]+$', '')
  ELSE regexp_replace(regexp_replace(trim("name"), '^#?[0-9]+\s+', ''), '^.*\s+', '')
END
WHERE "last_name" IS NULL OR trim("last_name") = '';
