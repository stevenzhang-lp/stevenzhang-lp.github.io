#!/bin/bash
# Revert the website to online status

echo "Restoring website pages..."

# 1. Remove the maintenance files
rm -f index.html 404.html

# 2. Restore original files
git mv index.html.bak index.html
git mv voyage.html.bak voyage.html
git mv journal.html.bak journal.html
git mv vault.html.bak vault.html
git mv math.html.bak math.html
git mv share.html.bak share.html
git mv diary.html.bak diary.html

echo "Website restored to original pages successfully."
echo "Please run: git add -A && git commit -m 'Restore website from maintenance' && git push"
