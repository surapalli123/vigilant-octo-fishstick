# Copilot Instructions

## Project Overview

This is **LLM Integration Toolkit** — a provider-agnostic Python framework for building applications with Large Language Models. The core library lives in `src/llm_integration/` and supports OpenAI, Anthropic, and Ollama providers behind a common `LLMClient` interface.

## Project Structure

- `src/llm_integration/client.py` — Base `LLMClient` ABC, `Message`, `LLMConfig`, `LLMResponse` dataclasses
- `src/llm_integration/prompt.py` — `PromptTemplate` and `ChatPromptTemplate`
- `src/llm_integration/chain.py` — `ConversationChain` for multi-turn history
- `src/llm_integration/providers/` — Provider implementations (`openai_provider.py`, `anthropic_provider.py`, `ollama_provider.py`)
- `examples/` — Runnable example scripts
- `tests/` — Unit tests (`test_client.py`, `test_prompt.py`, `test_chain.py`)

## Coding Conventions

- **Python 3.9+** — Use `from __future__ import annotations` for forward references.
- **Type hints** — All public functions and methods must include type annotations.
- **Dataclasses** — Prefer `@dataclass` for data models over plain classes or dicts.
- **Enums** — Use `str, Enum` pattern (e.g., `class Role(str, Enum)`) for serializable enums.
- **Docstrings** — Use Google/NumPy-style docstrings with `Parameters` / `Returns` sections for public APIs.
- **Abstract base classes** — Provider interface is defined via `ABC` + `@abstractmethod`. New providers must subclass `LLMClient` and implement `provider_name` (property) and `complete()`.

## Adding a New Provider

1. Create `src/llm_integration/providers/<name>_provider.py`.
2. Subclass `LLMClient`, implement `provider_name` and `complete()`.
3. Optionally override `stream()` for real streaming support.
4. Export the new class from `src/llm_integration/providers/__init__.py`.
5. Add corresponding tests in `tests/`.

## Dependencies

- Cloud provider SDKs (`openai`, `anthropic`) are **optional extras** — install via `pip install -e ".[openai]"` or `pip install -e ".[anthropic]"`.
- Ollama uses the `requests` library (core dependency) — no extra package needed.
- Keep `setup.py` extras in sync with `requirements.txt`.

## Testing

- Run tests with: `pytest tests/ -v`
- Tests should not require real API keys — mock external provider calls.
- Install dev dependencies: `pip install -e ".[dev]"`

## Key Design Principles

- **Provider-agnostic** — Application code programs against `LLMClient`, never directly against a provider SDK.
- **Minimal core** — The base package has only `requests` as a hard dependency.
- **Convenience helpers** — `LLMClient.chat()` wraps single-turn calls; `ConversationChain` manages multi-turn history.
- **Token tracking** — Every `LLMResponse` carries `prompt_tokens`, `completion_tokens`, and `total_tokens`.
