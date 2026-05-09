# Oracle Always Free Deployment (Exact Steps)

This guide is optimized for speed and low confusion.

## What You Will End Up With

1. Frontend URL: `http://<PUBLIC_IP>`
2. Voyago API: `http://<PUBLIC_IP>:8787/api/health`
3. Transiter API: `http://<PUBLIC_IP>:8000/health`

## Step 0 - Oracle Console (manual, required)

Create a VM with:

1. Shape: `VM.Standard.A1.Flex` (Always Free)
2. OS: Ubuntu 24.04
3. Public IP: enabled
4. Ingress ports allowed in your VCN Security List:
   - TCP `22` (SSH)
   - TCP `80` (frontend)
   - TCP `8787` (Voyago API)
   - TCP `8000` (Transiter API)

If you skip these ports, the site will not be reachable.

## Step 1 - SSH into VM

```bash
ssh -i <path-to-private-key> ubuntu@<PUBLIC_IP>
```

## Step 2 - Clone your repo

```bash
cd /opt
sudo git clone <YOUR_REPO_URL> voyago
sudo chown -R $USER:$USER /opt/voyago
cd /opt/voyago
```

## Step 3 - Run the one-shot setup script

```bash
bash deploy/oracle/setup_oracle_free.sh --public-ip <PUBLIC_IP>
```

This script will:

1. Install Node 20, Python 3.12, Caddy
2. Install npm + pip dependencies
3. Build frontend with correct API URLs
4. Configure and start:
   - `caddy`
   - `voyago-api` (systemd)
   - `transiter-api` (systemd)

## Step 4 - Verify

Run:

```bash
curl http://<PUBLIC_IP>:8787/api/health
curl http://<PUBLIC_IP>:8000/health
```

Then open in browser:

```text
http://<PUBLIC_IP>
```

## Step 5 - If something fails

Check service logs:

```bash
sudo systemctl status voyago-api --no-pager
sudo systemctl status transiter-api --no-pager
sudo journalctl -u voyago-api -n 120 --no-pager
sudo journalctl -u transiter-api -n 120 --no-pager
```

## Re-run behavior

You can safely re-run:

```bash
bash deploy/oracle/setup_oracle_free.sh --public-ip <PUBLIC_IP>
```

It will refresh dependencies/build and rewrite service configs.
