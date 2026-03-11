"""Multi-turn conversation demo using ConversationChain.

Demonstrates how conversation history is maintained across turns.

    OPENAI_API_KEY=sk-... python examples/multi_turn_chat.py --provider openai
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from llm_integration.chain import ConversationChain
from llm_integration.client import LLMConfig
from llm_integration.providers import AnthropicProvider, OllamaProvider, OpenAIProvider


DEMO_QUESTIONS = [
    "My name is Alex. What's a good hobby to start in winter?",
    "How much does that typically cost to get started?",
    "Do you remember my name?",
]


def build_client(provider: str, model: str):
    config = LLMConfig(model=model, temperature=0.7, max_tokens=256)
    if provider == "openai":
        return OpenAIProvider(config)
    if provider == "anthropic":
        return AnthropicProvider(config)
    return OllamaProvider(config)


def main() -> None:
    parser = argparse.ArgumentParser(description="Multi-turn conversation demo")
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

    chain = ConversationChain(
        client,
        system="You are a friendly and helpful assistant. Remember details the user shares.",
        max_history=10,
    )

    print(f"=== Multi-turn conversation with {args.provider}/{model} ===\n")
    for question in DEMO_QUESTIONS:
        print(f"User : {question}")
        reply = chain.send(question)
        print(f"AI   : {reply}\n")


if __name__ == "__main__":
    main()
