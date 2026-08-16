#!/usr/bin/env sh

set -eu

repository="${LIFEOS_GITHUB_REPOSITORY:-iamparthahudati/buildwithpartha}"

for branch in develop master; do
  gh api \
    --method PUT \
    --header "Accept: application/vnd.github+json" \
    --header "X-GitHub-Api-Version: 2022-11-28" \
    "repos/$repository/branches/$branch/protection" \
    --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "LifeOS / Documentation",
      "LifeOS / Frontend",
      "LifeOS / Backend",
      "LifeOS / Secret scan"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON
done

gh api \
  --method PATCH \
  --header "Accept: application/vnd.github+json" \
  --header "X-GitHub-Api-Version: 2022-11-28" \
  "repos/$repository" \
  --field default_branch=develop \
  >/dev/null

echo "Protected develop/master and set develop as the default branch for $repository."
