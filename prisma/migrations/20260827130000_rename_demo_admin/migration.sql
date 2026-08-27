-- Keep existing demo databases aligned with the current seeded administrator identity.
UPDATE "users"
SET
  "firstName" = 'Κώστας',
  "lastName" = 'Κατσίνας',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "email" = 'admin@chromeway.gr';

-- Update the seeded internal mention without rewriting historical audit snapshots.
UPDATE "comments"
SET
  "body" = replace(replace("body", '@Νίκος', '@Κώστας'), '@Νικος', '@Κώστας'),
  "mentions" = array_replace(array_replace("mentions", 'Νίκος', 'Κώστας'), 'Νικος', 'Κώστας')
WHERE
  "body" LIKE '%@Νίκος%'
  OR "body" LIKE '%@Νικος%'
  OR 'Νίκος' = ANY("mentions")
  OR 'Νικος' = ANY("mentions");
