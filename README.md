# Unlocked

Gamified achievement-tracking app: users complete real-life challenges
validated by their community/group, earn "Karma" points (with a bonus
for finishing first), and can wager "Tokens" on bets about who'll
complete a challenge first. See `docs/IDEAS.md` for the full product
brainstorm.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

The app ships as a single Docker image, served behind Caddy on a VPS. Pushing
to `main` runs CI; if it goes green, CD publishes the image to GHCR and
restarts the VPS.

### Set up the VPS once

Point the domain's DNS at the machine (Caddy needs it to answer the ACME
challenge), install Docker, then create a deployment directory:

```bash
mkdir -p /srv/unlocked && cd /srv/unlocked
# compose.yaml and Caddyfile come from this repository, unchanged
curl -O https://raw.githubusercontent.com/<owner>/<repo>/main/compose.yaml
curl -O https://raw.githubusercontent.com/<owner>/<repo>/main/Caddyfile
```

Write a `.env` next to them with `IMAGE`, `DOMAIN`, `AUTH_SECRET`,
`AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` and optionally
`BOOTSTRAP_ADMIN_EMAIL` — see `.env.example`, section "Deployment". Register
`https://<DOMAIN>/api/auth/callback/discord` as a redirect URI on the Discord
application, then:

```bash
docker compose up -d --wait
```

That first `up` needs the image to exist, so let one CD run publish it before
you reach for it — its deploy step will simply have failed on a VPS that was
not ready yet.

### Give the CD workflow access

Create a deploy key on the VPS (`ssh-keygen -t ed25519`), append the public
half to `~/.ssh/authorized_keys` there, and set these repository secrets:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | VPS hostname or IP |
| `DEPLOY_USER` | SSH user, member of the `docker` group |
| `DEPLOY_SSH_KEY` | the **private** half of the deploy key |
| `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan <DEPLOY_HOST>` |
| `DEPLOY_PATH` | deployment directory, e.g. `/srv/unlocked` |

The workflow logs the VPS into GHCR with a token that expires with the run, so
nothing long-lived is stored on the machine. Pulling by hand later — a
rollback, say — needs credentials again: either make the GHCR package public,
or `docker login ghcr.io` on the VPS with a `read:packages` token.

### Day to day

Each boot snapshots the database, applies pending migrations and re-runs the
idempotent seed before serving — `docker compose up -d` is all a release needs.

- **State** lives in the `data` volume: `unlocked.db`, `backups/`, `uploads/`.
  Back that volume up; nothing else on the machine is precious.
- **Roll back** by pinning `IMAGE` to a commit tag
  (`ghcr.io/<owner>/<repo>:<sha>`) and running `docker compose up -d --wait`.
  A rollback across a migration also needs the matching snapshot from
  `backups/` — migrations are not reversible.
- **Logs**: `docker compose logs -f app`.
