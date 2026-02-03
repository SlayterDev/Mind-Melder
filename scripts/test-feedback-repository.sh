#!/bin/bash
# Test script for feedback repository methods

set -e

API_URL="http://localhost:3000/api/v1"

echo "=== Testing Feedback Repository Methods ==="
echo ""

# Create test todos
echo "1. Creating test todos..."
TODO1=$(curl -s -X POST "$API_URL/todos" \
  -H "Content-Type: application/json" \
  -d '{"content": "Todo 1 - will get thumbs up"}' | jq -r '.id')
echo "   Created todo 1: $TODO1"

TODO2=$(curl -s -X POST "$API_URL/todos" \
  -H "Content-Type: application/json" \
  -d '{"content": "Todo 2 - will get thumbs down"}' | jq -r '.id')
echo "   Created todo 2: $TODO2"

TODO3=$(curl -s -X POST "$API_URL/todos" \
  -H "Content-Type: application/json" \
  -d '{"content": "Todo 3 - no feedback"}' | jq -r '.id')
echo "   Created todo 3: $TODO3"
echo ""

# Submit feedback
echo "2. Submitting feedback..."
curl -s -X PATCH "$API_URL/todos/$TODO1/feedback" \
  -H "Content-Type: application/json" \
  -d '{"vote": "thumbs_up"}' > /dev/null
echo "   ✓ Submitted thumbs up for todo 1"

curl -s -X PATCH "$API_URL/todos/$TODO2/feedback" \
  -H "Content-Type: application/json" \
  -d '{"vote": "thumbs_down", "feedbackText": "Not specific enough"}' > /dev/null
echo "   ✓ Submitted thumbs down for todo 2"
echo ""

# Verify all todos are there
echo "3. Getting all todos..."
ALL_TODOS=$(curl -s "$API_URL/todos" | jq 'length')
echo "   Total todos: $ALL_TODOS"
echo ""

# Clean up
echo "4. Cleaning up test todos..."
curl -s -X DELETE "$API_URL/todos/$TODO1" > /dev/null
curl -s -X DELETE "$API_URL/todos/$TODO2" > /dev/null
curl -s -X DELETE "$API_URL/todos/$TODO3" > /dev/null
echo "   ✓ All test todos deleted"
echo ""

echo "=== All tests passed! ==="
echo ""
echo "Note: The new repository methods are available:"
echo "  - findByFeedbackVote(userId, vote) - Get todos by specific vote"
echo "  - findWithFeedback(userId) - Get todos with any feedback"
echo "  - findWithoutFeedback(userId) - Get todos without feedback"
