#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Testing Mind Melder API ==="
echo

echo "1. Health Check"
curl -s "$BASE_URL/health" | jq
echo

echo "2. Create Capture"
CAPTURE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/captures" \
  -H "Content-Type: application/json" \
  -d '{"content": "Buy groceries", "metadata": {"priority": "high"}}')
echo "$CAPTURE_RESPONSE" | jq
CAPTURE_ID=$(echo "$CAPTURE_RESPONSE" | jq -r '.id')
echo

echo "3. List Captures"
curl -s "$BASE_URL/api/v1/captures" | jq 'length'
echo

echo "4. Get Unorganized Captures"
curl -s "$BASE_URL/api/v1/captures/unorganized" | jq 'length'
echo

echo "5. Create Todo"
TODO_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/todos" \
  -H "Content-Type: application/json" \
  -d '{"content": "Review API implementation"}')
echo "$TODO_RESPONSE" | jq
TODO_ID=$(echo "$TODO_RESPONSE" | jq -r '.id')
echo

echo "6. List Todos"
curl -s "$BASE_URL/api/v1/todos" | jq 'map({id, content, status})'
echo

echo "7. Mark Todo as Complete"
curl -s -X PATCH "$BASE_URL/api/v1/todos/$TODO_ID/complete" | jq '.status'
echo

echo "8. Create Template"
TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/templates" \
  -H "Content-Type: application/json" \
  -d '{"name": "Weekly Review", "prompt": "Summarize the week and identify key takeaways"}')
echo "$TEMPLATE_RESPONSE" | jq
echo

echo "9. Get Active Templates"
curl -s "$BASE_URL/api/v1/templates/active" | jq 'length'
echo

echo "10. Test Validation Error"
curl -s -X POST "$BASE_URL/api/v1/captures" \
  -H "Content-Type: application/json" \
  -d '{"content": ""}' | jq
echo

echo "=== All tests completed! ==="
