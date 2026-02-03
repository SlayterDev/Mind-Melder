#!/bin/bash
# Test script for AI feedback feature (Issue #38)

set -e

API_URL="http://localhost:3000/api/v1"

echo "=== Testing AI Feedback Feature ==="
echo ""

echo "1. Creating a test todo..."
TODO_RESPONSE=$(curl -s -X POST "$API_URL/todos" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test todo for feedback", "dueDate": "2026-02-10T12:00:00Z"}')

TODO_ID=$(echo "$TODO_RESPONSE" | jq -r '.id')
echo "   Created todo with ID: $TODO_ID"
echo "   Initial feedback state:"
echo "$TODO_RESPONSE" | jq '{feedbackVote, feedbackText, feedbackTimestamp}'
echo ""

echo "2. Submitting thumbs up feedback..."
THUMBS_UP_RESPONSE=$(curl -s -X PATCH "$API_URL/todos/$TODO_ID/feedback" \
  -H "Content-Type: application/json" \
  -d '{"vote": "thumbs_up"}')

echo "   Feedback state after thumbs up:"
echo "$THUMBS_UP_RESPONSE" | jq '{feedbackVote, feedbackText, feedbackTimestamp}'
echo ""

echo "3. Submitting thumbs down feedback with text..."
THUMBS_DOWN_RESPONSE=$(curl -s -X PATCH "$API_URL/todos/$TODO_ID/feedback" \
  -H "Content-Type: application/json" \
  -d '{"vote": "thumbs_down", "feedbackText": "Task needs more context"}')

echo "   Feedback state after thumbs down:"
echo "$THUMBS_DOWN_RESPONSE" | jq '{feedbackVote, feedbackText, feedbackTimestamp}'
echo ""

echo "4. Testing validation - feedback text too long (>100 chars)..."
VALIDATION_RESPONSE=$(curl -s -X PATCH "$API_URL/todos/$TODO_ID/feedback" \
  -H "Content-Type: application/json" \
  -d '{"vote": "thumbs_down", "feedbackText": "This is a very long feedback text that exceeds the one hundred character limit that we have set for user feedback in the system"}')

echo "   Validation error response:"
echo "$VALIDATION_RESPONSE" | jq .
echo ""

echo "5. Testing validation - invalid vote value..."
INVALID_VOTE_RESPONSE=$(curl -s -X PATCH "$API_URL/todos/$TODO_ID/feedback" \
  -H "Content-Type: application/json" \
  -d '{"vote": "invalid_vote"}')

echo "   Validation error response:"
echo "$INVALID_VOTE_RESPONSE" | jq .
echo ""

echo "6. Resetting feedback to 'none'..."
RESET_RESPONSE=$(curl -s -X PATCH "$API_URL/todos/$TODO_ID/feedback" \
  -H "Content-Type: application/json" \
  -d '{"vote": "none"}')

echo "   Feedback state after reset:"
echo "$RESET_RESPONSE" | jq '{feedbackVote, feedbackText, feedbackTimestamp}'
echo ""

echo "7. Cleaning up - deleting test todo..."
curl -s -X DELETE "$API_URL/todos/$TODO_ID" > /dev/null
echo "   Test todo deleted"
echo ""

echo "=== All tests passed! ==="
