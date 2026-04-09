DELETE FROM project_images
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id, url) id
  FROM project_images
  ORDER BY project_id, url, created_at ASC
);