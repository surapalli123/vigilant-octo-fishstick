"""Anthropic provider implementation.

Requires the ``anthropic`` package::

    pip install anthropic

Set the ``ANTHROPIC_API_KEY`` environment variable before use.
"""

from __future__ import annotations

import os
from typing import Iterator, List, Optional

from ..client import LLMClient, LLMConfig, LLMResponse, Message, Role


class AnthropicProvider(LLMClient):
    """LLM client backed by the Anthropic Messages API (Claude models).

    Example
    -------
    >>> from llm_integration.providers import AnthropicProvider
    >>> from llm_integration.client import LLMConfig
    >>> client = AnthropicProvider(LLMConfig(model="claude-3-haiku-20240307"))
    >>> print(client.chat("What is 2 + 2?"))
    """

    def __init__(
        self,
        config: Optional[LLMConfig] = None,
        api_key: Optional[str] = None,
    ) -> None:
        try:
            import anthropic  # noqa: F401
        except ImportError as exc:
            raise ImportError(
                "The 'anthropic' package is required for AnthropicProvider. "
                "Install it with: pip install anthropic"
            ) from exc

        super().__init__(config or LLMConfig(model="claude-3-haiku-20240307"))
        self._api_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")

    @property
    def provider_name(self) -> str:
        return "anthropic"

    def _get_client(self):
        import anthropic

        return anthropic.Anthropic(api_key=self._api_key)

    @staticmethod
    def _split_system(messages: List[Message]):
        """Separate the system message from the rest.

        Anthropic's API accepts ``system`` as a top-level string, not as a
        message in the array.
        """
        system_parts = []
        non_system = []
        for msg in messages:
            if msg.role == Role.SYSTEM:
                system_parts.append(msg.content)
            else:
                non_system.append(msg)
        system_text = "\n\n".join(system_parts) or None
        return system_text, non_system

    def complete(self, messages: List[Message]) -> LLMResponse:
        client = self._get_client()
        system_text, non_system = self._split_system(messages)

        kwargs = {
            "model": self.config.model,
            "max_tokens": self.config.max_tokens,
            "messages": [m.to_dict() for m in non_system],
            "temperature": self.config.temperature,
            "top_p": self.config.top_p,
            **self.config.extra,
        }
        if system_text:
            kwargs["system"] = system_text

        response = client.messages.create(**kwargs)
        content = response.content[0].text if response.content else ""
        return LLMResponse(
            content=content,
            model=response.model,
            provider=self.provider_name,
            prompt_tokens=response.usage.input_tokens,
            completion_tokens=response.usage.output_tokens,
        )

    def stream(self, messages: List[Message]) -> Iterator[str]:
        client = self._get_client()
        system_text, non_system = self._split_system(messages)

        kwargs = {
            "model": self.config.model,
            "max_tokens": self.config.max_tokens,
            "messages": [m.to_dict() for m in non_system],
            "temperature": self.config.temperature,
            "top_p": self.config.top_p,
            **self.config.extra,
        }
        if system_text:
            kwargs["system"] = system_text

        with client.messages.stream(**kwargs) as stream_resp:
            for text in stream_resp.text_stream:
                yield text
