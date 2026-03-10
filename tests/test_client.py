"""Tests for the core LLM client abstractions (Message, LLMConfig, LLMClient)."""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from llm_integration.client import (
    LLMClient,
    LLMConfig,
    LLMResponse,
    Message,
    Role,
)


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

class EchoClient(LLMClient):
    """Minimal concrete client that echoes the last user message."""

    @property
    def provider_name(self) -> str:
        return "echo"

    def complete(self, messages):
        last_user = next(
            (m for m in reversed(messages) if m.role == Role.USER), None
        )
        content = f"ECHO: {last_user.content}" if last_user else ""
        return LLMResponse(
            content=content,
            model=self.config.model,
            provider=self.provider_name,
        )


@pytest.fixture
def echo_client():
    return EchoClient(LLMConfig(model="echo-v1"))


# ---------------------------------------------------------------------------
# Message tests
# ---------------------------------------------------------------------------

class TestMessage:
    def test_factory_methods(self):
        assert Message.system("s").role == Role.SYSTEM
        assert Message.user("u").role == Role.USER
        assert Message.assistant("a").role == Role.ASSISTANT

    def test_to_dict(self):
        msg = Message.user("hello")
        d = msg.to_dict()
        assert d == {"role": "user", "content": "hello"}

    def test_role_values(self):
        assert Role.SYSTEM.value == "system"
        assert Role.USER.value == "user"
        assert Role.ASSISTANT.value == "assistant"


# ---------------------------------------------------------------------------
# LLMConfig tests
# ---------------------------------------------------------------------------

class TestLLMConfig:
    def test_defaults(self):
        cfg = LLMConfig(model="test-model")
        assert cfg.temperature == 0.7
        assert cfg.max_tokens == 1024
        assert cfg.top_p == 1.0
        assert cfg.system_prompt is None
        assert cfg.extra == {}

    def test_custom_values(self):
        cfg = LLMConfig(model="gpt-4", temperature=0.0, max_tokens=256)
        assert cfg.temperature == 0.0
        assert cfg.max_tokens == 256


# ---------------------------------------------------------------------------
# LLMResponse tests
# ---------------------------------------------------------------------------

class TestLLMResponse:
    def test_total_tokens(self):
        resp = LLMResponse(
            content="hi",
            model="m",
            provider="p",
            prompt_tokens=10,
            completion_tokens=5,
        )
        assert resp.total_tokens == 15

    def test_defaults(self):
        resp = LLMResponse(content="ok", model="m", provider="p")
        assert resp.prompt_tokens == 0
        assert resp.completion_tokens == 0
        assert resp.total_tokens == 0


# ---------------------------------------------------------------------------
# LLMClient (via EchoClient) tests
# ---------------------------------------------------------------------------

class TestLLMClient:
    def test_provider_name(self, echo_client):
        assert echo_client.provider_name == "echo"

    def test_complete_returns_response(self, echo_client):
        messages = [Message.user("ping")]
        resp = echo_client.complete(messages)
        assert isinstance(resp, LLMResponse)
        assert "ping" in resp.content

    def test_chat_helper(self, echo_client):
        reply = echo_client.chat("hello")
        assert "hello" in reply

    def test_chat_with_system(self, echo_client):
        reply = echo_client.chat("hi", system="Be terse.")
        assert "hi" in reply

    def test_chat_uses_config_system_prompt(self):
        client = EchoClient(LLMConfig(model="m", system_prompt="Be helpful."))
        reply = client.chat("test")
        assert "test" in reply

    def test_stream_default(self, echo_client):
        messages = [Message.user("stream me")]
        chunks = list(echo_client.stream(messages))
        assert len(chunks) == 1
        assert "stream me" in chunks[0]
