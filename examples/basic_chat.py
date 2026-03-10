"""Basic single-turn chat example.

Run with any provider that has its API key set:

    # OpenAI
    OPENAI_API_KEY=sk-... python examples/basic_chat.py --provider openai

    # Anthropic
    ANTHROPIC_API_KEY=sk-ant-... python examples/basic_chat.py --provider anthropic

    # Local Ollama (no API key required)
    python examples/basic_chat.py --provider ollama --model llama3
"""

import argparse
import sys
import os

# Allow running from the repo root without installing the package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from llm_integration.client import LLMConfig
from llm_integration.providers import AnthropicProvider, OllamaProvider, OpenAIProvider


def build_client(provider: str, model: str):
    config = LLMConfig(
        model=model,
        temperature=0.7,
        max_tokens=512,
        system_prompt="You are a concise and helpful AI assistant.",
    )
    if provider == "openai":
        return OpenAIProvider(config)
    if provider == "anthropic":
        return AnthropicProvider(config)
    if provider == "ollama":
        return OllamaProvider(config)
    raise ValueError(f"Unknown provider: {provider!r}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Single-turn LLM chat demo")
    parser.add_argument(
        "--provider",
        default="openai",
        choices=["openai", "anthropic", "ollama"],
        help="LLM provider to use",
    )
    parser.add_argument("--model", default=None, help="Model name override")
    parser.add_argument("message", nargs="?", default="Tell me a fun fact about Python.")
    args = parser.parse_args()

    default_models = {
        "openai": "gpt-4o-mini",
        "anthropic": "claude-3-haiku-20240307",
        "ollama": "llama3",
    }
    model = args.model or default_models[args.provider]

    client = build_client(args.provider, model)
    print(f"Provider : {client.provider_name}")
    print(f"Model    : {client.config.model}")
    print(f"Message  : {args.message}")
    print("-" * 60)
    reply = client.chat(args.message)
    print(reply)


if __name__ == "__main__":
    main()
