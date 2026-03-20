#!/bin/bash
# Upload client logos to Payload CMS and attach to clients

API_URL="http://localhost:3000/api"
LOGO_DIR="$HOME/Desktop/logos"

# Map filenames to client IDs
declare -A CLIENT_MAP
CLIENT_MAP["Dex.svg"]=4
CLIENT_MAP["Gather.svg"]=5
CLIENT_MAP["goodword.svg"]=6
CLIENT_MAP["Google Ventures.svg"]=7
CLIENT_MAP["Grandstand.svg"]=8
CLIENT_MAP["Kiosk.svg"]=9
CLIENT_MAP["National Design Studio.svg"]=10
CLIENT_MAP["Profile.svg"]=11
CLIENT_MAP["roon.svg"]=12
CLIENT_MAP["Ritual Dental.svg"]=13
CLIENT_MAP["Sensible.svg"]=14
CLIENT_MAP["Slingshot AI.svg"]=15
CLIENT_MAP["SuperMe.svg"]=16
CLIENT_MAP["Supper.svg"]=17
CLIENT_MAP["The Majority Group.svg"]=19
CLIENT_MAP["workmate.svg"]=20
CLIENT_MAP["World Playground.svg"]=21

for filename in "${!CLIENT_MAP[@]}"; do
  client_id="${CLIENT_MAP[$filename]}"
  filepath="$LOGO_DIR/$filename"

  if [ ! -f "$filepath" ]; then
    echo "SKIP: $filename not found"
    continue
  fi

  echo "Uploading $filename..."

  # Upload to media collection
  media_response=$(curl -s -X POST "$API_URL/media" \
    -F "file=@$filepath" \
    -F "alt=${filename%.svg} logo")

  media_id=$(echo "$media_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('doc',{}).get('id',''))" 2>/dev/null)

  if [ -z "$media_id" ]; then
    echo "  FAIL: Could not upload $filename"
    echo "  Response: $media_response"
    continue
  fi

  echo "  Media ID: $media_id"

  # Attach to client
  update_response=$(curl -s -X PATCH "$API_URL/clients/$client_id" \
    -H "Content-Type: application/json" \
    -d "{\"logo\": $media_id}")

  updated_name=$(echo "$update_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('doc',{}).get('name',''))" 2>/dev/null)

  echo "  Attached to: $updated_name (ID: $client_id)"
done

echo "Done!"
