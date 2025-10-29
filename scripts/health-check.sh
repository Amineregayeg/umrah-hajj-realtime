#!/bin/bash

# Health check script for Umrah backend
# Usage: ./health-check.sh [URL]

URL=${1:-"http://localhost:8080/health"}
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Checking health endpoint: $URL"

for i in $(seq 1 $MAX_RETRIES); do
  response=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
  
  if [ "$response" -eq 200 ]; then
    echo "✓ Health check passed! (Attempt $i/$MAX_RETRIES)"
    exit 0
  else
    echo "✗ Health check failed with status code: $response (Attempt $i/$MAX_RETRIES)"
    
    if [ $i -lt $MAX_RETRIES ]; then
      echo "Retrying in $RETRY_INTERVAL seconds..."
      sleep $RETRY_INTERVAL
    fi
  fi
done

echo "Health check failed after $MAX_RETRIES attempts"
exit 1