#!/usr/bin/env bash
# Trigger trailer generation and poll status. Requires Inngest dev server and Next.js running.
set -e
BASE="${1:-http://localhost:2000}"
# Minimal valid trailer script (pipeline needs 3 scenes with visualPrompt, openingSlate, endSlate)
SCRIPT='{
  "showTitle": "The Office",
  "tagline": "Every dog has his day.",
  "openingSlate": "Meet Buddy.",
  "endSlate": "Coming this fall.",
  "scenes": [
    {"sceneNumber":1,"episodeTitle":"Pilot","title":"The New Guy","description":"sitting at desk","visualPrompt":"dog sitting at desk looking at camera","comedyTechnique":"deadpan","duration":5,"mood":"funny","dogAction":"sitting","setting":"office"},
    {"sceneNumber":2,"episodeTitle":"Pilot","title":"The Run","description":"running in hallway","visualPrompt":"dog running down hallway happily","comedyTechnique":"physical","duration":5,"mood":"chaotic","dogAction":"running","setting":"hallway"},
    {"sceneNumber":3,"episodeTitle":"Pilot","title":"The Nap","description":"napping under desk","visualPrompt":"dog napping under desk","comedyTechnique":"reaction","duration":5,"mood":"heartwarming","dogAction":"napping","setting":"office"}
  ],
  "totalDuration": 30,
  "endSlate": "Coming this fall."
}'
STYLE_IMAGE="https://images.dog.ceo/breeds/retriever-golden/n02099601_100.jpg"

echo "Calling generate-from-style..."
RESP=$(curl -s -X POST "$BASE/api/preview/generate-from-style" \
  -H "Content-Type: application/json" \
  -d "{
    \"styleImageUrl\": \"$STYLE_IMAGE\",
    \"dogName\": \"Buddy\",
    \"comedyStyle\": \"The Office\",
    \"trailerScript\": $SCRIPT,
    \"artStyle\": \"liveAction\",
    \"selectedShows\": [\"The Office\"]
  }")
echo "$RESP"
JOB_ID=$(echo "$RESP" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
if [ -z "$JOB_ID" ]; then
  echo "No jobId in response. Check rate limit or API error."
  exit 1
fi
echo "JobId: $JOB_ID"
echo "Polling status every 5s (max 3 min)..."
for i in $(seq 1 36); do
  sleep 5
  STATUS=$(curl -s "$BASE/api/preview/status/$JOB_ID")
  echo "[$i] $STATUS"
  if echo "$STATUS" | grep -q '"status":"completed"'; then
    echo "Trailer completed."
    echo "$STATUS" | grep -o '"videoUrl":"[^"]*"'
    exit 0
  fi
  if echo "$STATUS" | grep -q '"status":"failed"'; then
    echo "Trailer failed."
    echo "$STATUS"
    exit 1
  fi
done
echo "Timeout waiting for completion."
