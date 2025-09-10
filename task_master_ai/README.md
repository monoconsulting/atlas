# task_master_ai

Tiny helper package to provide AI-assisted utilities for TaskMasterWeb. It includes a minimal wrapper that will call OpenAI if an API key is present, or fall back to a simple deterministic responder.

Usage examples:

python -m task_master_ai.cli --prompt "Summarize the repository"

To enable OpenAI: set the environment variable OPENAI_API_KEY and install the `openai` package.
