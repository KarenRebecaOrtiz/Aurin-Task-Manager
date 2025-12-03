#!/bin/bash

# Test the chatbot API
echo "Testing chatbot API..."
echo ""

curl -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Lista todas las tareas en el sistema",
    "sessionId": "test-session-001"
  }' | jq '.'

