"""Prompt template demo.

Shows how to use PromptTemplate and ChatPromptTemplate to build reusable,
parameterised prompts.

    python examples/prompt_templates.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from llm_integration.prompt import ChatPromptTemplate, PromptTemplate


def demo_basic_template() -> None:
    print("=== Basic PromptTemplate ===")
    tpl = PromptTemplate(
        "You are a {role}. Explain {concept} in simple terms."
    )
    print("Variables:", tpl.variables)

    filled = tpl.format(role="teacher", concept="recursion")
    print("Filled   :", filled)

    partial = tpl.partial(role="pirate")
    print("Partial  :", partial.format(concept="machine learning"))


def demo_partial_template() -> None:
    print("\n=== Partial templates ===")
    base = PromptTemplate("Summarise the following {language} code:\n\n{code}")
    python_summary = base.partial(language="Python")
    print(python_summary.format(code="def hello(): return 'hi'"))


def demo_chat_template() -> None:
    print("\n=== ChatPromptTemplate ===")
    code_review_template = PromptTemplate(
        "Review this code snippet:\n\n```\n{code}\n```"
    )
    tpl = ChatPromptTemplate(
        system="You are a senior Python engineer. Be concise and precise.",
        user_template=code_review_template,
    )
    msgs = tpl.format_messages(code="x = [i**2 for i in range(10)]")
    for m in msgs:
        print(f"[{m['role']:9s}] {m['content']}")


if __name__ == "__main__":
    demo_basic_template()
    demo_partial_template()
    demo_chat_template()
