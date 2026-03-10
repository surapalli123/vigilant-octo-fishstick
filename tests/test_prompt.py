"""Tests for the PromptTemplate and ChatPromptTemplate classes."""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from llm_integration.prompt import ChatPromptTemplate, PromptTemplate


class TestPromptTemplate:
    def test_format_basic(self):
        tpl = PromptTemplate("Hello, {name}!")
        assert tpl.format(name="World") == "Hello, World!"

    def test_variables(self):
        tpl = PromptTemplate("Hello {name}, you are {age} years old.")
        assert set(tpl.variables) == {"name", "age"}

    def test_no_variables(self):
        tpl = PromptTemplate("Static text.")
        assert tpl.variables == []

    def test_missing_variable_raises(self):
        tpl = PromptTemplate("Hello {name}!")
        with pytest.raises(KeyError):
            tpl.format()

    def test_extra_variables_ignored(self):
        tpl = PromptTemplate("Hello {name}!")
        # Extra kwargs should just be ignored by str.format
        result = tpl.format(name="Alice", unused="ignored")
        assert result == "Hello Alice!"

    def test_partial(self):
        tpl = PromptTemplate("Translate {text} to {language}.")
        partial = tpl.partial(language="French")
        assert partial.format(text="Hello") == "Translate Hello to French."

    def test_partial_leaves_unfilled_intact(self):
        tpl = PromptTemplate("Hello {name}, you have {count} messages.")
        partial = tpl.partial(name="Bob")
        assert "{count}" in partial.template
        assert "{name}" not in partial.template

    def test_repr(self):
        tpl = PromptTemplate("test {x}")
        assert "test {x}" in repr(tpl)

    def test_from_file(self, tmp_path):
        p = tmp_path / "prompt.txt"
        p.write_text("File template: {value}", encoding="utf-8")
        tpl = PromptTemplate.from_file(str(p))
        assert tpl.format(value="ok") == "File template: ok"

    def test_chat_template_factory(self):
        tpl = PromptTemplate.chat_template(
            system="You are a helper.",
            user_template="What is {topic}?",
        )
        assert isinstance(tpl, ChatPromptTemplate)
        msgs = tpl.format_messages(topic="Python")
        assert msgs[0]["role"] == "system"
        assert msgs[1]["content"] == "What is Python?"


class TestChatPromptTemplate:
    def test_with_system(self):
        tpl = ChatPromptTemplate(
            system="You are helpful.",
            user_template=PromptTemplate("Question: {q}"),
        )
        msgs = tpl.format_messages(q="What time is it?")
        assert len(msgs) == 2
        assert msgs[0] == {"role": "system", "content": "You are helpful."}
        assert msgs[1]["role"] == "user"
        assert "What time is it?" in msgs[1]["content"]

    def test_without_system(self):
        tpl = ChatPromptTemplate(
            user_template=PromptTemplate("Say {word}."),
        )
        msgs = tpl.format_messages(word="hello")
        assert len(msgs) == 1
        assert msgs[0]["role"] == "user"

    def test_missing_variable_raises(self):
        tpl = ChatPromptTemplate(
            user_template=PromptTemplate("Hello {name}!"),
        )
        with pytest.raises(KeyError):
            tpl.format_messages()
