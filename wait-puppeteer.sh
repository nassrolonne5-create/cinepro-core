#!/bin/bash
while true; do
  if npm list puppeteer > /dev/null 2>&1; then
    break
  fi
  sleep 1
done
node test-puppeteer.cjs
