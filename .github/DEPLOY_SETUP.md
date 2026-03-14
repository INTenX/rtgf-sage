# CI/CD Deploy Setup

## One-time setup per target host

### 1. Generate a deploy key (run on your local machine or INTenXDev)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy@rtgf-interface" -f ~/.ssh/rtgf_deploy_key -N ""
```

This creates:
- `~/.ssh/rtgf_deploy_key`       — private key (goes into GitHub)
- `~/.ssh/rtgf_deploy_key.pub`   — public key (goes onto the target server)

### 2. Install the public key on the target host (Ubuntu-AI-Hub)

```bash
cat ~/.ssh/rtgf_deploy_key.pub | ssh cbasta@ubuntu-ai-hub \
  "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Or manually append the `.pub` contents to `~/.ssh/authorized_keys` on the target.

### 3. Configure GitHub Environment secrets

Go to: **GitHub → repo → Settings → Environments → New environment**

Create an environment named `production` (must match `deploy.yml`), then add:

| Secret / Variable | Value |
|-------------------|-------|
| `SSH_PRIVATE_KEY` *(secret)* | Contents of `~/.ssh/rtgf_deploy_key` |
| `SSH_HOST` *(secret)* | IP or hostname of Ubuntu-AI-Hub |
| `SSH_USER` *(variable, optional)* | `cbasta` (default) |
| `SSH_PORT` *(variable, optional)* | `22` (default) |
| `DEPLOY_PATH` *(variable, optional)* | `/home/cbasta/rtgf-ai-stack` (default) |

### 4. Verify

Push any change to `interface/` on master — Actions tab will show the run.

---

## Adding a partner company environment

1. Generate a fresh key pair (never reuse keys across environments).
2. Install public key on the partner host.
3. Create a new GitHub Environment (e.g. `partner-acme`).
4. Add the same set of secrets pointing to the partner host.
5. In `deploy.yml` → `setup` job, add `"partner-acme"` to the push environments list.

Each environment is fully isolated — different SSH keys, different host, different deploy path.
