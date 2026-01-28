#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "🧪 Testing Today Sheet API..."
echo ""

# Test 1: Check health
echo "1️⃣  Health check"
curl -s "$BASE_URL/../health" | jq .
echo ""

# Test 2: Check templates
echo "2️⃣  Active templates"
curl -s "$BASE_URL/templates/active" | jq 'length'
echo ""

# Test 3: Check unorganized captures
echo "3️⃣  Unorganized captures"
curl -s "$BASE_URL/captures" | jq '[.[] | select(.organized == null)] | length'
echo ""

# Test 4: Generate Today Sheet
echo "4️⃣  POST /today-sheet/generate"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/today-sheet/generate" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "$BODY" | jq '.'
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Success! Today Sheet generated"

  # Test 5: Get Today Sheet
  echo ""
  echo "5️⃣  GET /today-sheet"
  curl -s "$BASE_URL/today-sheet" | jq '.sections | to_entries | map({section: .key, count: (.value | length)})'

else
  echo "❌ Failed to generate Today Sheet"
  echo "Check the API server logs for details"
fi
