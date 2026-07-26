-- Drop tables in reverse order
DROP TABLE IF EXISTS sync_events;
DROP TABLE IF EXISTS canvas_objects;
DROP TABLE IF EXISTS room_users;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp";
