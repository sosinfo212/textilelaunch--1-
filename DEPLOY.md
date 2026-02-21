# Deploy on server

## First-time setup (new server)

1. **SSH into the server as root**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

2. **Get the deploy script onto the server**
   - Option A: clone the repo, then run the script from inside it:
     ```bash
     git clone https://github.com/sosinfo212/textilelaunch--1-.git /opt/textilelaunch
     cd /opt/textilelaunch
     sudo bash deploy.sh
     ```
   - Option B: copy only `deploy.sh` to the server (e.g. with `scp`), then run it. The script will clone the repo to `/opt/textilelaunch` if the directory is empty or missing.

3. **Run the full deploy script (on the server as root)**
   ```bash
   cd /opt/textilelaunch
   sudo bash deploy.sh
   ```
   This installs Node, MariaDB, Nginx, creates the DB user, clones/updates the app, builds the frontend, creates `.env`, configures systemd and Nginx, and (if you use the included steps) SSL with Certbot.

4. **Run DB migrations** (once, after first deploy)
   ```bash
   mysql -u textilelaunch_db -p agency < /opt/textilelaunch/database/add-analytics-events-table.sql
   mysql -u textilelaunch_db -p agency < /opt/textilelaunch/database/add-product-views-table.sql
   mysql -u textilelaunch_db -p agency < /opt/textilelaunch/database/add-product-views-device-browser.sql
   ```
   Use the same DB user/password as in `fix-database.sh` / `.env`.

---

## Regular updates (already deployed)

1. **SSH into the server**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

2. **Run the update script**
   ```bash
   cd /opt/textilelaunch
   sudo bash update-server.sh
   ```
   This pulls latest from GitHub, runs `npm install` and `npm run build`, runs `fix-database.sh` (so DB connection stays correct), and restarts the `textilelaunch` service.

3. **Check the app**
   ```bash
   systemctl status textilelaunch
   journalctl -u textilelaunch -f
   ```

---

## Paths and service (current setup)

| Item        | Value                |
|------------|----------------------|
| App path   | `/opt/textilelaunch`  |
| Service    | `textilelaunch`      |
| Node port  | `5001`               |
| DB name    | `agency`             |
| DB user    | `textilelaunch_db`   |

Frontend is served by Nginx from `/opt/textilelaunch/dist`; `/api` is proxied to `http://127.0.0.1:5001`.
