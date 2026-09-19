#!/usr/bin/env bash
set -euo pipefail
PROJECT_REF="nbamzmphhqnlfkpibezu"
npx supabase functions deploy integration-test --project-ref "$PROJECT_REF"
npx supabase functions deploy broadcast-dispatch --project-ref "$PROJECT_REF"
npx supabase functions deploy order-notify --project-ref "$PROJECT_REF" --no-verify-jwt
npx supabase functions deploy shipping-rates --project-ref "$PROJECT_REF" --no-verify-jwt
npx supabase functions deploy staff-invite --project-ref "$PROJECT_REF"
npx supabase functions deploy stock-alert --project-ref "$PROJECT_REF"
