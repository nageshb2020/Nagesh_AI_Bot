# Run this ONCE after `docker compose up -d` to pull the required Ollama models.
# Models are persisted in the ollama_data Docker volume — only needed on first run.

Write-Host "Pulling Ollama models for Personal Recruiter Bot..." -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Pulling llama3.2 (chat model ~2GB)..." -ForegroundColor Yellow
docker exec recruiter-bot-ollama ollama pull llama3.2

Write-Host ""
Write-Host "[2/2] Pulling nomic-embed-text (embedding model ~270MB)..." -ForegroundColor Yellow
docker exec recruiter-bot-ollama ollama pull nomic-embed-text

Write-Host ""
Write-Host "Models ready! Bot will be available at http://localhost:3000" -ForegroundColor Green
