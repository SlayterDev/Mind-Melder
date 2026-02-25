#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Testing Template Suggestions Feature ==="
echo

echo "1. Create a template for testing"
TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Organization Template",
    "prompt": "Extract actionable tasks from captures. Be concise and specific."
  }')
echo "$TEMPLATE_RESPONSE" | jq
TEMPLATE_ID=$(echo "$TEMPLATE_RESPONSE" | jq -r '.id')
echo "Created template with ID: $TEMPLATE_ID"
echo

echo "2. Activate the template"
curl -s -X PATCH "$BASE_URL/api/v1/templates/$TEMPLATE_ID" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}' | jq
echo

echo "3. Create some captures for context"
curl -s -X POST "$BASE_URL/api/v1/captures" \
  -H "Content-Type: application/json" \
  -d '{"content": "Fix bug in login page"}' | jq -c '{id, content}'
echo

echo "4. Create and complete a todo"
TODO_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/todos" \
  -H "Content-Type: application/json" \
  -d '{"content": "Write documentation for API endpoints"}')
TODO_ID=$(echo "$TODO_RESPONSE" | jq -r '.id')
curl -s -X PATCH "$BASE_URL/api/v1/todos/$TODO_ID/complete" | jq -c '{id, content, status}'
echo

echo "5. Generate a weekly review (optional - may take time)"
echo "Skipping weekly review generation for faster testing..."
echo

echo "6. Request template improvement suggestions"
echo "Requesting suggestions for template: $TEMPLATE_ID"
SUGGESTIONS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/weekly-review/template-suggestions" \
  -H "Content-Type: application/json" \
  -d "{\"templateId\": \"$TEMPLATE_ID\"}")
echo "$SUGGESTIONS_RESPONSE" | jq
echo

if echo "$SUGGESTIONS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo "✅ Template suggestions generated successfully!"
  echo
  echo "Suggestion titles:"
  echo "$SUGGESTIONS_RESPONSE" | jq -r '.suggestions[].title' | nl
else
  echo "❌ Failed to generate suggestions"
  echo "Error: $(echo "$SUGGESTIONS_RESPONSE" | jq -r '.error // "Unknown error"')"
fi

echo
echo "=== Test completed! ==="
