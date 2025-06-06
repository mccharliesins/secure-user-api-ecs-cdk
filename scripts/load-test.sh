#!/bin/bash
# simple load tester to generate traffic during deployment

URL=$1

if [ -z "$URL" ]; then
  echo "usage: ./load-test.sh <url>"
  exit 1
fi

echo "starting load test on $URL..."
echo "press ctrl+c to stop"

while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL)
  echo "[$(date)] GET $URL - Status: $STATUS"
  sleep 0.5
done
