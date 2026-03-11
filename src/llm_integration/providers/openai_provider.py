"""OpenAI provider implementation.

Requires the ``openai`` package::

    pip install openai

Set the ``OPENAI_API_KEY`` environment variable before use.
"""

from __future__ import annotations

import os
from typing import Iterator, List, Optional

from ..client import LLMClient, LLMConfig, LLMResponse, Message


class OpenAIProvider(LLMClient):
    """LLM client backed by the OpenAI Chat Completions API.

    Example
    -------
    >>> from llm_integration.providers import OpenAIProvider
    >>> from llm_integration.client import LLMConfig
    >>> client = OpenAIProvider(LLMConfig(model="gpt-4o-mini"))
    >>> print(client.chat("What is 2 + 2?"))
    """

    def __init__(
        self,
        config: Optional[LLMConfig] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> None:
        try:
            import openai  # noqa: F401 – checked here to give a helpful error
        except ImportError as exc:
            raise ImportError(
                "The 'openai' package is required for OpenAIProvider. "
                "Install it with: pip install openai"
            ) from exc

        super().__init__(config or LLMConfig(model="gpt-4o-mini"))
        self._api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self._base_url = base_url

    @property
    def provider_name(self) -> str:
        return "openai"

    def _get_client(self):
        import openai

        return openai.OpenAI(api_key=self._api_key, base_url=self._base_url)

    def complete(self, messages: List[Message]) -> LLMResponse:
        client = self._get_client()
        response = client.chat.completions.create(
            model=self.config.model,
            messages=[m.to_dict() for m in messages],
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
            top_p=self.config.top_p,
            **self.config.extra,
        )
        choice = response.choices[0]
        usage = response.usage
        return LLMResponse(
            content=choice.message.content or "",
            model=response.model,
            provider=self.provider_name,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
        )

    def stream(self, messages: List[Message]) -> Iterator[str]:
        client = self._get_client()
        with client.chat.completions.create(
            model=self.config.model,
            messages=[m.to_dict() for m in messages],
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
            top_p=self.config.top_p,
            stream=True,
            **self.config.extra,
        ) as stream_resp:
            for chunk in stream_resp:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
