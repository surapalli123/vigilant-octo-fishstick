"""
Core LLM client abstraction.

Defines the common interface that all LLM providers must implement and
the data models shared across the toolkit.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Iterator, List, Optional


class Role(str, Enum):
    """Roles for chat messages."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


@dataclass
class Message:
    """A single chat message."""

    role: Role
    content: str

    def to_dict(self) -> dict:
        return {"role": self.role.value, "content": self.content}

    @classmethod
    def system(cls, content: str) -> "Message":
        return cls(role=Role.SYSTEM, content=content)

    @classmethod
    def user(cls, content: str) -> "Message":
        return cls(role=Role.USER, content=content)

    @classmethod
    def assistant(cls, content: str) -> "Message":
        return cls(role=Role.ASSISTANT, content=content)


@dataclass
class LLMResponse:
    """Response returned by an LLM provider."""

    content: str
    model: str
    provider: str
    prompt_tokens: int = 0
    completion_tokens: int = 0

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens


@dataclass
class LLMConfig:
    """Configuration shared across all providers."""

    model: str
    temperature: float = 0.7
    max_tokens: int = 1024
    top_p: float = 1.0
    system_prompt: Optional[str] = None
    extra: dict = field(default_factory=dict)


class LLMClient(ABC):
    """Abstract base class for all LLM provider clients.

    Subclass this and implement ``complete`` (and optionally ``stream``)
    to add a new provider.
    """

    def __init__(self, config: LLMConfig) -> None:
        self.config = config

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider name (e.g. "openai", "anthropic")."""

    @abstractmethod
    def complete(self, messages: List[Message]) -> LLMResponse:
        """Send *messages* to the LLM and return a single response."""

    def stream(self, messages: List[Message]) -> Iterator[str]:
        """Yield response tokens one at a time.

        The default implementation calls :meth:`complete` and yields the
        full response as a single chunk.  Override this for providers that
        support true streaming.
        """
        yield self.complete(messages).content

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    def chat(self, user_message: str, *, system: Optional[str] = None) -> str:
        """Single-turn convenience wrapper.

        Parameters
        ----------
        user_message:
            The user turn text.
        system:
            Optional system prompt that overrides ``config.system_prompt``.

        Returns
        -------
        str
            The assistant's reply.
        """
        messages: List[Message] = []
        effective_system = system or self.config.system_prompt
        if effective_system:
            messages.append(Message.system(effective_system))
        messages.append(Message.user(user_message))
        return self.complete(messages).content
