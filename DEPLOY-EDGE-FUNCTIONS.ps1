$ProjectRef = "nbamzmphhqnlfkpibezu"

npx supabase functions deploy integration-test --project-ref $ProjectRef
npx supabase functions deploy broadcast-dispatch --project-ref $ProjectRef
npx supabase functions deploy order-notify --project-ref $ProjectRef --no-verify-jwt
npx supabase functions deploy shipping-rates --project-ref $ProjectRef --no-verify-jwt
npx supabase functions deploy staff-invite --project-ref $ProjectRef
npx supabase functions deploy stock-alert --project-ref $ProjectRef
