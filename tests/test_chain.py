"""Tests for the ConversationChain class."""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from llm_integration.chain import ConversationChain
from llm_integration.client import LLMClient, LLMConfig, LLMResponse, Message, Role


# ---------------------------------------------------------------------------
# Stub client for tests
# ---------------------------------------------------------------------------

class CountingClient(LLMClient):
    """Returns a fixed reply and records every call made to it."""

    def __init__(self, reply: str = "ok"):
        super().__init__(LLMConfig(model="counter"))
        self._reply = reply
        self.calls: list = []

    @property
    def provider_name(self) -> str:
        return "counter"

    def complete(self, messages):
        self.calls.append(list(messages))
        return LLMResponse(
            content=self._reply,
            model="counter",
            provider="counter",
        )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestConversationChain:
    def test_send_returns_reply(self):
        client = CountingClient(reply="hello back")
        chain = ConversationChain(client)
        reply = chain.send("hi")
        assert reply == "hello back"

    def test_history_grows(self):
        client = CountingClient()
        chain = ConversationChain(client)
        chain.send("turn 1")
        chain.send("turn 2")
        # 2 user + 2 assistant messages
        assert len(chain.history) == 4

    def test_history_is_copy(self):
        client = CountingClient()
        chain = ConversationChain(client)
        chain.send("test")
        history = chain.history
        history.clear()
        assert len(chain.history) > 0

    def test_reset_clears_history(self):
        client = CountingClient()
        chain = ConversationChain(client)
        chain.send("hello")
        chain.reset()
        assert chain.history == []

    def test_system_prompt_prepended(self):
        client = CountingClient()
        chain = ConversationChain(client, system="You are a robot.")
        chain.send("beep")
        first_call_messages = client.calls[0]
        assert first_call_messages[0].role == Role.SYSTEM
        assert "robot" in first_call_messages[0].content

    def test_no_system_prompt(self):
        client = CountingClient()
        chain = ConversationChain(client)
        chain.send("hi")
        first_call_messages = client.calls[0]
        assert first_call_messages[0].role == Role.USER

    def test_max_history_trims_old_turns(self):
        client = CountingClient()
        chain = ConversationChain(client, max_history=2)
        for i in range(5):
            chain.send(f"message {i}")
        # max 2 turns = 4 messages
        assert len(chain.history) <= 4

    def test_max_history_none_keeps_all(self):
        client = CountingClient()
        chain = ConversationChain(client, max_history=None)
        for i in range(10):
            chain.send(f"message {i}")
        assert len(chain.history) == 20  # 10 user + 10 assistant

    def test_messages_passed_to_client_include_history(self):
        client = CountingClient()
        chain = ConversationChain(client)
        chain.send("first")
        chain.send("second")
        # Second call should include first user + assistant in context
        second_call = client.calls[1]
        roles = [m.role for m in second_call]
        assert Role.ASSISTANT in roles  # history is included

    def test_system_from_client_config(self):
        client = CountingClient()
        client.config.system_prompt = "From config."
        chain = ConversationChain(client)
        chain.send("hi")
        first_call = client.calls[0]
        assert first_call[0].role == Role.SYSTEM
        assert "From config." in first_call[0].content

    def test_chain_system_overrides_client_config(self):
        client = CountingClient()
        client.config.system_prompt = "Config system."
        chain = ConversationChain(client, system="Chain system.")
        chain.send("hi")
        first_call = client.calls[0]
        assert "Chain system." in first_call[0].content
