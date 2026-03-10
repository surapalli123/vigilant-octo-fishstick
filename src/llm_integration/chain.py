"""Multi-turn conversation chain management."""

from __future__ import annotations

from typing import List, Optional

from .client import LLMClient, Message, Role


class ConversationChain:
    """Manages a multi-turn conversation with an LLM.

    Keeps a rolling history of messages and injects an optional system
    prompt at the start of every request.

    Example
    -------
    >>> chain = ConversationChain(client, system="You are a helpful assistant.")
    >>> reply1 = chain.send("What is the capital of France?")
    >>> reply2 = chain.send("And of Germany?")
    """

    def __init__(
        self,
        client: LLMClient,
        system: Optional[str] = None,
        max_history: Optional[int] = None,
    ) -> None:
        """
        Parameters
        ----------
        client:
            An :class:`~llm_integration.client.LLMClient` instance.
        system:
            Optional system prompt prepended to every request.
        max_history:
            Maximum number of *turns* (user + assistant pairs) to keep.
            Older turns are dropped when the limit is exceeded.  ``None``
            means unlimited.
        """
        self.client = client
        self.system = system
        self.max_history = max_history
        self._history: List[Message] = []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def send(self, user_message: str) -> str:
        """Add *user_message* to the history and return the assistant reply."""
        self._history.append(Message.user(user_message))
        messages = self._build_messages()
        response = self.client.complete(messages)
        self._history.append(Message.assistant(response.content))
        self._trim_history()
        return response.content

    def reset(self) -> None:
        """Clear the conversation history."""
        self._history.clear()

    @property
    def history(self) -> List[Message]:
        """Read-only view of the current conversation history."""
        return list(self._history)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_messages(self) -> List[Message]:
        messages: List[Message] = []
        effective_system = self.system or self.client.config.system_prompt
        if effective_system:
            messages.append(Message.system(effective_system))
        messages.extend(self._history)
        return messages

    def _trim_history(self) -> None:
        if self.max_history is None:
            return
        # Each turn = user + assistant, so max messages = max_history * 2
        max_messages = self.max_history * 2
        if len(self._history) > max_messages:
            self._history = self._history[-max_messages:]
