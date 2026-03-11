"""Ollama provider — runs LLMs locally via the Ollama REST API.

Requires a running Ollama instance (https://ollama.com).  No external API
key is needed.

By default the provider connects to ``http://localhost:11434``.  Override
``base_url`` if your Ollama server is running elsewhere.

Example
-------
>>> from llm_integration.providers import OllamaProvider
>>> from llm_integration.client import LLMConfig
>>> client = OllamaProvider(LLMConfig(model="llama3"))
>>> print(client.chat("Why is the sky blue?"))
"""

from __future__ import annotations

import json
from typing import Iterator, List, Optional

import requests

from ..client import LLMClient, LLMConfig, LLMResponse, Message, Role


class OllamaProvider(LLMClient):
    """LLM client backed by a local Ollama server.

    Ollama exposes an OpenAI-compatible ``/api/chat`` endpoint that this
    provider uses directly via ``requests`` — no extra SDK required.
    """

    DEFAULT_BASE_URL = "http://localhost:11434"

    def __init__(
        self,
        config: Optional[LLMConfig] = None,
        base_url: Optional[str] = None,
    ) -> None:
        super().__init__(config or LLMConfig(model="llama3"))
        self.base_url = (base_url or self.DEFAULT_BASE_URL).rstrip("/")

    @property
    def provider_name(self) -> str:
        return "ollama"

    def _chat_url(self) -> str:
        return f"{self.base_url}/api/chat"

    @staticmethod
    def _build_payload(config: LLMConfig, messages: List[Message], stream: bool) -> dict:
        return {
            "model": config.model,
            "messages": [m.to_dict() for m in messages],
            "stream": stream,
            "options": {
                "temperature": config.temperature,
                "num_predict": config.max_tokens,
                "top_p": config.top_p,
                **config.extra,
            },
        }

    def complete(self, messages: List[Message]) -> LLMResponse:
        payload = self._build_payload(self.config, messages, stream=False)
        resp = requests.post(self._chat_url(), json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        content = data.get("message", {}).get("content", "")
        usage = data.get("prompt_eval_count", 0), data.get("eval_count", 0)
        return LLMResponse(
            content=content,
            model=data.get("model", self.config.model),
            provider=self.provider_name,
            prompt_tokens=usage[0],
            completion_tokens=usage[1],
        )

    def stream(self, messages: List[Message]) -> Iterator[str]:
        payload = self._build_payload(self.config, messages, stream=True)
        with requests.post(
            self._chat_url(), json=payload, stream=True, timeout=120
        ) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                content = data.get("message", {}).get("content", "")
                if content:
                    yield content
                if data.get("done"):
                    break

    def list_models(self) -> List[str]:
        """Return a list of locally available model names."""
        resp = requests.get(f"{self.base_url}/api/tags", timeout=10)
        resp.raise_for_status()
        return [m["name"] for m in resp.json().get("models", [])]
