#!/bin/bash

# Test script for tags functionality
# NOTE: Requires API server running and PostgreSQL available

BASE_URL="http://localhost:3000"

echo "=== Testing Mind Melder Tags System ==="
echo
echo "Prerequisites:"
echo "1. API server must be running: pnpm dev"
echo "2. PostgreSQL must be running: docker compose up -d postgres"
echo

# Create tags
echo "1. Creating test tags..."
curl -s -X POST "$BASE_URL/api/v1/tags" \
  -H "Content-Type: application/json" \
  -d '{"name": "Work", "description": "Work-related tasks and notes"}' | jq -c '{name, description}'

curl -s -X POST "$BASE_URL/api/v1/tags" \
  -H "Content-Type: application/json" \
  -d '{"name": "Personal", "description": "Personal tasks and errands"}' | jq -c '{name, description}'

curl -s -X POST "$BASE_URL/api/v1/tags" \
  -H "Content-Type: application/json" \
  -d '{"name": "Ideas", "description": "Creative ideas and brainstorming"}' | jq -c '{name, description}'

echo
echo "2. Listing all tags..."
curl -s "$BASE_URL/api/v1/tags" | jq '.[] | {name, description}'
echo

# Get specific tag
TAG_ID=$(curl -s "$BASE_URL/api/v1/tags" | jq -r '.[0].id')
echo "3. Getting specific tag (ID: $TAG_ID)..."
curl -s "$BASE_URL/api/v1/tags/$TAG_ID" | jq '{name, description, userId}'
echo

# Update tag
echo "4. Updating tag description..."
curl -s -X PATCH "$BASE_URL/api/v1/tags/$TAG_ID" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description for work items"}' | jq '{name, description}'
echo

# Test duplicate tag (should fail)
echo "5. Testing duplicate tag creation (should return error)..."
curl -s -X POST "$BASE_URL/api/v1/tags" \
  -H "Content-Type: application/json" \
  -d '{"name": "Work", "description": "This should fail"}' | jq
echo

echo "=== Tag Tests Complete ==="
