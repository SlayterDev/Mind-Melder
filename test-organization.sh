#!/bin/bash

# Test script for LLM organization flow
# NOTE: Requires valid API key in .env file for chosen LLM provider

BASE_URL="http://localhost:3000"

echo "=== Testing Mind Melder LLM Organization ==="
echo
echo "Prerequisites:"
echo "1. API server must be running: pnpm dev"
echo "2. PostgreSQL must be running: docker compose up -d postgres"
echo "3. Valid API key in .env for chosen LLM_PROVIDER"
echo

# Create test template
echo "1. Creating organization template..."
TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Organization",
    "prompt": "Organize these notes into categories: Work, Personal, and Ideas. Extract any actionable tasks as todos with due dates if mentioned. Be concise and clear."
  }')
echo "$TEMPLATE_RESPONSE" | jq
TEMPLATE_ID=$(echo "$TEMPLATE_RESPONSE" | jq -r '.id')
echo

# Create test captures
echo "2. Creating test captures..."
curl -s -X POST "$BASE_URL/api/v1/captures" \
  -H "Content-Type: application/json" \
  -d '{"content": "Schedule dentist appointment for next week"}' | jq -c '{id, content}'

curl -s -X POST "$BASE_URL/api/v1/captures" \
  -H "Content-Type: application/json" \
  -d '{"content": "Research React 19 new features for blog post"}' | jq -c '{id, content}'

curl -s -X POST "$BASE_URL/api/v1/captures" \
  -H "Content-Type: application/json" \
  -d '{"content": "Buy groceries: milk, eggs, bread"}' | jq -c '{id, content}'

curl -s -X POST "$BASE_URL/api/v1/captures" \
  -H "Content-Type: application/json" \
  -d '{"content": "Idea: Build a tool for managing API documentation"}' | jq -c '{id, content}'

echo
echo "3. Checking unorganized captures..."
UNORG_COUNT=$(curl -s "$BASE_URL/api/v1/captures/unorganized" | jq 'length')
echo "Unorganized captures: $UNORG_COUNT"
echo

# Trigger organization
echo "4. Triggering LLM organization..."
echo "(This will use the LLM provider specified in .env)"
ORGANIZE_RESULT=$(curl -s -X POST "$BASE_URL/api/v1/organize" \
  -H "Content-Type: application/json" \
  -d "{\"templateId\": \"$TEMPLATE_ID\"}")

echo "$ORGANIZE_RESULT" | jq
echo

# Check results
echo "5. Checking organized notes..."
curl -s "$BASE_URL/api/v1/notes" | jq '.[] | {category, content: .content[0:80]}'
echo

echo "6. Checking extracted todos..."
curl -s "$BASE_URL/api/v1/todos?status=pending" | jq '.[] | {content, dueDate}'
echo

echo "7. Verifying captures are marked as organized..."
UNORG_COUNT_AFTER=$(curl -s "$BASE_URL/api/v1/captures/unorganized" | jq 'length')
echo "Unorganized captures after: $UNORG_COUNT_AFTER"
echo

echo "=== Test Complete ==="
