# vigilant-octo-fishstick

This repository contains two projects:

1. **Habit Tracker** — full-stack web application (React + Express + Prisma + SQLite)
2. **LLM Integration Toolkit** — provider-agnostic Python framework for LLMs

---

## Habit Tracker — Quick Start

### Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **npm 9+** — bundled with Node.js 20

### 1. Install all dependencies

```bash
cd habit-tracker
npm install
```

This installs dependencies for `client/` and `server/` via npm workspaces.

### 2. Set up the database

```bash
cd habit-tracker/server
npx prisma migrate dev --name init
```

Creates `prisma/dev.db` (SQLite) and generates the Prisma client.

### 3. Run development servers

```bash
cd habit-tracker

# Terminal 1 — frontend at http://localhost:5173
npm run dev:client

# Terminal 2 — backend  at http://localhost:3001
npm run dev:server
```

### 4. Available root scripts (from `habit-tracker/`)

| Command | Description |
|---|---|
| `npm install` | Install all workspace dependencies |
| `npm run build` | Build client and server |
| `npm run test` | Run all unit tests (Vitest) |
| `npm run lint` | Lint client and server |
| `npm run dev:client` | Start Vite dev server |
| `npm run dev:server` | Start Express server with live reload |

### Structure

```
habit-tracker/
├── client/     React + Vite + TypeScript frontend
├── server/     Express + TypeScript backend + Prisma schema
├── e2e/        Playwright E2E placeholder tests
└── README.md   Full habit-tracker documentation
.github/        GitHub Actions CI workflow (lint / test / build)
```

See [`habit-tracker/README.md`](habit-tracker/README.md) for full documentation.

---

## LLM Integration Toolkit — vigilant-octo-fishstick

A provider-agnostic Python framework for building applications with Large
Language Models (LLMs).  Write your logic once against the common
`LLMClient` interface and swap between OpenAI, Anthropic (Claude), or a
local Ollama model without changing application code.

---

## Features

| Feature | Description |
|---|---|
| **Provider abstraction** | Common `LLMClient` interface; switch providers with one line |
| **OpenAI support** | GPT-4o, GPT-4o-mini, and every model in the Chat Completions API |
| **Anthropic support** | Claude 3 Haiku, Sonnet, Opus, and newer Claude models |
| **Ollama support** | Run Llama 3, Mistral, Gemma, and other open-weight models locally |
| **Prompt templates** | Reusable `PromptTemplate` with `{variable}` substitution |
| **Conversation chains** | `ConversationChain` manages multi-turn history automatically |
| **Streaming** | Token-by-token streaming for all providers |
| **Token tracking** | Prompt / completion / total token counts on every response |

---

## Project Structure

```
.
├── src/llm_integration/          # Core library
│   ├── client.py                 # LLMClient base class, Message, LLMConfig, LLMResponse
│   ├── prompt.py                 # PromptTemplate, ChatPromptTemplate
│   ├── chain.py                  # ConversationChain
│   └── providers/
│       ├── openai_provider.py    # OpenAI Chat Completions
│       ├── anthropic_provider.py # Anthropic Messages API
│       └── ollama_provider.py    # Local Ollama REST API
├── examples/
│   ├── basic_chat.py             # Single-turn chat
│   ├── multi_turn_chat.py        # Multi-turn conversation with history
│   ├── prompt_templates.py       # Prompt template demos (no API key needed)
│   └── streaming.py              # Real-time streaming output
├── tests/
│   ├── test_client.py
│   ├── test_prompt.py
│   └── test_chain.py
├── requirements.txt
└── setup.py
```

---

## Quick Start

### 1. Install dependencies

```bash
pip install -e ".[openai]"          # OpenAI only
pip install -e ".[anthropic]"       # Anthropic only
pip install -e ".[all]"             # All cloud providers
pip install -e ".[dev]"             # Include test dependencies
```

Ollama requires no extra Python package — just a running
[Ollama](https://ollama.com) server.

### 2. Set your API key

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Single-turn chat

```python
from llm_integration.client import LLMConfig
from llm_integration.providers import OpenAIProvider

client = OpenAIProvider(LLMConfig(model="gpt-4o-mini"))
print(client.chat("What is a large language model?"))
```

### 4. Multi-turn conversation

```python
from llm_integration.chain import ConversationChain
from llm_integration.client import LLMConfig
from llm_integration.providers import AnthropicProvider

client = AnthropicProvider(LLMConfig(model="claude-3-haiku-20240307"))
chain = ConversationChain(client, system="You are a helpful tutor.")

print(chain.send("What is gradient descent?"))
print(chain.send("Can you give a simple code example?"))
```

### 5. Prompt templates

```python
from llm_integration.prompt import PromptTemplate

tpl = PromptTemplate("Explain {concept} as if I am a {audience}.")
print(tpl.format(concept="neural networks", audience="five-year-old"))
```

### 6. Streaming output

```python
from llm_integration.client import LLMConfig, Message
from llm_integration.providers import OllamaProvider  # local, no API key

client = OllamaProvider(LLMConfig(model="llama3"))
messages = [Message.user("Write a haiku about coding.")]
for token in client.stream(messages):
    print(token, end="", flush=True)
print()
```

---

## Providers

### OpenAI

```python
from llm_integration.providers import OpenAIProvider
from llm_integration.client import LLMConfig

client = OpenAIProvider(
    LLMConfig(model="gpt-4o", temperature=0.5, max_tokens=2048),
    api_key="sk-...",          # or set OPENAI_API_KEY
    base_url="https://...",    # optional: custom endpoint / Azure OpenAI
)
```

### Anthropic

```python
from llm_integration.providers import AnthropicProvider
from llm_integration.client import LLMConfig

client = AnthropicProvider(
    LLMConfig(model="claude-3-sonnet-20240229"),
    api_key="sk-ant-...",      # or set ANTHROPIC_API_KEY
)
```

### Ollama (local)

```bash
# Start Ollama and pull a model first
ollama serve
ollama pull llama3
```

```python
from llm_integration.providers import OllamaProvider
from llm_integration.client import LLMConfig

client = OllamaProvider(
    LLMConfig(model="llama3"),
    base_url="http://localhost:11434",  # default
)
print(client.list_models())
```

---

## Adding a New Provider

1. Subclass `LLMClient` in `src/llm_integration/providers/`.
2. Implement `provider_name` (property) and `complete()`.
3. Optionally override `stream()` for real streaming.
4. Export from `src/llm_integration/providers/__init__.py`.

```python
from llm_integration.client import LLMClient, LLMConfig, LLMResponse, Message
from typing import List

class MyProvider(LLMClient):
    @property
    def provider_name(self) -> str:
        return "my_provider"

    def complete(self, messages: List[Message]) -> LLMResponse:
        # Call your provider API here
        ...
```

---

## Running the Examples

```bash
# No API key needed
python examples/prompt_templates.py

# Requires OPENAI_API_KEY
python examples/basic_chat.py --provider openai
python examples/multi_turn_chat.py --provider openai
python examples/streaming.py --provider openai

# Requires ANTHROPIC_API_KEY
python examples/basic_chat.py --provider anthropic

# Requires a running Ollama server
python examples/basic_chat.py --provider ollama --model llama3
```

---

## Running Tests

```bash
pip install pytest
pytest tests/ -v
```

---

## License

[MIT](LICENSE)
