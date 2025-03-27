#!/bin/bash

# Default values
DB_NAME="knex_types_test"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_PORT="5432"
CONTAINER_NAME="knex-types-postgres"

# Stop and remove existing container if it exists
echo "Cleaning up existing container..."
docker stop $CONTAINER_NAME >/dev/null 2>&1
docker rm $CONTAINER_NAME >/dev/null 2>&1

# Start PostgreSQL container
echo "Starting PostgreSQL container..."
docker run --name $CONTAINER_NAME \
  -e POSTGRES_DB=$DB_NAME \
  -e POSTGRES_USER=$DB_USER \
  -e POSTGRES_PASSWORD=$DB_PASSWORD \
  -p $DB_PORT:5432 \
  -d postgres:15

# Wait for PostgreSQL to start
echo "Waiting for PostgreSQL to start..."
sleep 5

# Create test schema
echo "Creating test schema..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME << EOF
-- Create ENUMs
CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');
CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');

-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN users.email IS 'User email address';
COMMENT ON COLUMN users.metadata IS 'Additional user metadata stored as JSON';

-- Create posts table
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  status post_status NOT NULL DEFAULT 'draft',
  tags TEXT[],
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN posts.tags IS 'Array of post tags';
COMMENT ON COLUMN posts.view_count IS 'Number of times the post has been viewed';

-- Insert some test data
INSERT INTO users (name, email, role, metadata) VALUES
  ('Admin User', 'admin@example.com', 'admin', '{"isVerified": true, "theme": "dark"}'::jsonb),
  ('Regular User', 'user@example.com', 'user', '{"isVerified": true, "theme": "light"}'::jsonb),
  ('Guest User', 'guest@example.com', 'guest', '{"isVerified": false}'::jsonb);

INSERT INTO posts (user_id, title, content, status, tags, view_count) VALUES
  (1, 'First Post', 'Hello World!', 'published', ARRAY['hello', 'first'], 100),
  (1, 'Draft Post', 'Work in progress...', 'draft', ARRAY['wip'], 0),
  (2, 'Another Post', 'Some content here', 'published', ARRAY['general'], 50);

EOF

# Create .env file
echo "Creating .env file..."
cat > .env << EOF
DB_HOST=localhost
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_DATABASE=$DB_NAME
EOF

echo "Done! Test database is ready."
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo "  Database: $DB_NAME"
echo ""
echo "To stop the database:"
echo "  docker stop $CONTAINER_NAME"
echo ""
echo "To start it again:"
echo "  docker start $CONTAINER_NAME" 