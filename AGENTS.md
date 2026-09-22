# Instructions for AI coding agents (Claude, Codex, or any other tool)

## Keep the changelog current

This repo has a [CHANGELOG.md](CHANGELOG.md). Whenever you make a real,
user-visible or database change (new feature, bug fix, schema/RLS change —
not a typo fix or pure refactor), add a dated bullet to the TOP of it,
in the same bilingual (Arabic + English) style as the existing entries.
This is the project owner's main way of tracking "what changed and when"
across different tools and sessions without reading code or git history.

## Write real commit messages

Every commit message should say *why* the change was made, not just *what*
file changed — one or two sentences is enough. The project owner reads
these directly; don't leave them as generic placeholders like "update" or
"fix".

## Database changes go through a tracked SQL file

This project's backend is Supabase, driven from the browser with a
publishable key — there's no server layer, so the database itself is the
real security boundary (see the top of
[supabase-rls.sql](supabase-rls.sql) for why). Any schema, RLS, trigger,
or storage-policy change belongs in a new `supabase-<topic>.sql` file at
the repo root, written for the project owner to paste into the Supabase
Dashboard SQL Editor themselves — never assume direct database access.
Follow the existing files' bilingual comment style.
