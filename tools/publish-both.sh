#!/bin/sh
# Push main to both repos (Slack + Salesforce) and republish both live sites from it. Run from the repo root once the
# checks pass (npm run check, npm run selftest). The Salesforce side uses your Salesforce EMU account's gh token.
#
#   sh tools/publish-both.sh
#
# Slack site: ../design-pages/slack-mobile (a clone of slack-github.com/colson-rice/design-pages, pushed to main).
# Salesforce site: site/ (a worktree of this repo's gh-pages branch, pushed to the salesforce remote).
set -e
SHA=$(git rev-parse --short HEAD)
SFEMU=${SFEMU_USER:-colson-rice_sfemu}
GH_SFEMU_TOKEN=$(gh auth token -h github.com -u "$SFEMU")
export GH_SFEMU_TOKEN
sfgit() { git -c 'credential.https://github.com.helper=' -c "credential.https://github.com.helper=!f() { echo username=$SFEMU; echo \"password=\$GH_SFEMU_TOKEN\"; }; f" "$@"; }

echo "== push main ($SHA) to both repos"
sfgit fetch -q salesforce
if ! git merge-base --is-ancestor salesforce/main HEAD; then git merge --no-edit -q salesforce/main; SHA=$(git rev-parse --short HEAD); fi
sfgit push origin main

echo "== Slack Design Pages"
git -C ../design-pages pull --rebase -q
node tools/publish.mjs ../design-pages/slack-mobile /colson-rice/design-pages/slack-mobile/ | tail -1
git -C ../design-pages add -A slack-mobile
git -C ../design-pages commit -q -m "Slack for iPhone: rebuild from slack-mobile-clone @ $SHA" -m "Co-Authored-By: Claude <svc-devxp-claude@slack-corp.com>" || echo "(no changes)"
git -C ../design-pages push -q

echo "== Salesforce private Pages"
node tools/publish.mjs site / | tail -1
git -C site add -A
git -C site commit -q -m "Slack for iPhone: rebuild from main @ $SHA" -m "Co-Authored-By: Claude <svc-devxp-claude@slack-corp.com>" || echo "(no changes)"
sfgit -C site push -q salesforce gh-pages

echo "== done: https://pages.slack-github.com/colson-rice/design-pages/slack-mobile/ and https://laughing-adventure-8g6g51z.pages.github.io/"
