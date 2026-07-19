# Mulak Agent System

The autonomous agent company that runs Mulak (mulak.app), operated under Ganaken.
Every agent reports to Argus. Abdulla (CEO) talks only to Argus via Telegram.

## Structure

- `agents/` — each agent's scripts, identity, and playbooks
- `skills/` — shared skills library (SKILL.md packs) loaded by agents
- `monitor/` — infrastructure cost & usage monitor (no AI)

## Live agents

Tester, Security, SEO, Planner, Poster, Scout, Monitor, Daedalus.

## Rules

- Secrets never live in this repo. Every `.env` and key file is gitignored.
- Update the skill or playbook first, then the behaviour follows.
- One Supabase project, one droplet, one Telegram channel.
