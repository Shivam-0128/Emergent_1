# Habit Circle — PRD

## Original problem statement
Simple community habit tracker for friends/colleagues: sign up/sign in (email+password, no confirmation), My habits (private/shared), habit page with Last 7 days ticks, Days done and Current streak, Community page with shared habits and comments.

## Architecture
FastAPI + MongoDB (users, habits with completions array of YYYY-MM-DD, comments). JWT auth (bcrypt), token in localStorage as Bearer + httpOnly cookie. React + react-router; pages: /signup, /signin, /habits, /habits/:id, /community.

## Implemented (2026-06)
- Sign up / Sign in / Sign out, redirect to My habits
- Top nav + sidebar (My habits, Community, Sign out)
- Add habit (name, When I do it, share box unticked by default), Shared/Private label
- Habit page: Last 7 days checkboxes (owner only), Days done, Current streak
- Community: shared habits only, owner name, Days done; comments with author names
- Tested: backend 9/9, frontend E2E all pass

## Backlog
- P2: login attempt lockout; edit/delete habits (not requested)
