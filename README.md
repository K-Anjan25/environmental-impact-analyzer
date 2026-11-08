<div align="center">
  <img src="apps/web/public/brand/mark.svg" alt="EcoImpact Lab logo" width="88" />
  <h1>EcoImpact Lab</h1>
  <p>A browser-based calculator for selected apparel and footwear processes. It shows the 16 EF 3.1 impact indicators for published process factors and totals only the rows you choose. It is not a complete product footprint.</p>
</div>

## Run locally

Install the API and web dependencies once:

```bash
python -m venv .venv
.venv/bin/python -m pip install -r services/api/requirements-dev.txt
npm ci --prefix apps/web
```

On Windows, use `.venv\\Scripts\\python.exe` instead of `.venv/bin/python`.

Start the app from the repository root:

```bash
npm run dev --prefix apps/web
```

The development command starts the API on `127.0.0.1:8000`, waits for its health check, then starts Vite. It shuts down the API when Vite exits. If an API is already healthy on port 8000, it reuses it. If Python dependencies are missing or the API fails to start, it prints an actionable error and does not start Vite, avoiding repeated proxy failures. To choose a Python interpreter, set `PYTHON` before running the command.
