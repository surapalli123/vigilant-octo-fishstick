"""Streaming output demo.

Demonstrates real-time token streaming from any supported provider.

    OPENAI_API_KEY=sk-... python examples/streaming.py --provider openai
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from llm_integration.client import LLMConfig, Message
from llm_integration.providers import AnthropicProvider, OllamaProvider, OpenAIProvider


def build_client(provider: str, model: str):
    config = LLMConfig(model=model, temperature=0.8, max_tokens=512)
    if provider == "openai":
        return OpenAIProvider(config)
    if provider == "anthropic":
        return AnthropicProvider(config)
    return OllamaProvider(config)


def main() -> None:
    parser = argparse.ArgumentParser(description="Streaming output demo")
    parser.add_argument("--provider", default="openai",
                        choices=["openai", "anthropic", "ollama"])
    parser.add_argument("--model", default=None)
    args = parser.parse_args()

    default_models = {
        "openai": "gpt-4o-mini",
        "anthropic": "claude-3-haiku-20240307",
        "ollama": "llama3",
    }
    model = args.model or default_models[args.provider]
    client = build_client(args.provider, model)

    messages = [
        Message.system("You are a creative storyteller."),
        Message.user("Write a very short (3-sentence) story about a robot who discovers music."),
    ]

    print(f"Streaming from {args.provider}/{model}:\n")
    for token in client.stream(messages):
        print(token, end="", flush=True)
    print()


if __name__ == "__main__":
    main()
