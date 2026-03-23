# Local Lightweight Model Setup

This project already supports OpenAI-compatible APIs.  
You can run a local lightweight model (for example via Ollama) without changing the core chat flow.

## Recommended model profiles

- `qwen2.5:7b` - best speed/quality balance (recommended)
- `qwen2.5:3b` - fastest and smallest, but quality is lower
- `llama3.1:8b` - stronger quality, slower and larger

## One-time setup

1. Install Ollama for Windows: <https://ollama.com/download/windows>
2. Open terminal A in project root and start local Ollama:
   - `.\start-local-ollama.ps1`
3. Open terminal B in project root and pull model to project-local cache:
   - `.\pull-local-model.ps1 -Model qwen2.5:7b`
4. Switch backend runtime config to local model:
   - `.\switch-to-local-model.ps1 -Model qwen2.5:7b`

## Start the system (project-local caches)

Terminal C:

- `.\run-backend-local.ps1`

Terminal D:

- `.\run-frontend-local.ps1`

Then open:

- Frontend: <http://localhost:3000>
- Admin: <http://localhost:3000/admin>

## Admin page settings (if you set manually)

- Base URL: `http://127.0.0.1:11435/v1`
- Model: `qwen2.5:7b` (or your pulled model name)
- API Key: can be empty for localhost/127.0.0.1

## Cache locations

All runtime/model caches are redirected to:

- `.cache/ollama/models` (model files)
- `.cache/huggingface` (HF/transformers cache)
- `.cache/pip` (pip cache)
- `.cache/npm` (npm cache)
- `.cache/tmp` (temporary files)
- `.cache/xdg` (XDG cache)

No model cache is written to the default system cache directory when running via these scripts.
