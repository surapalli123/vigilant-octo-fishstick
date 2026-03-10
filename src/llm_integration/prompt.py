"""Prompt template system with variable substitution."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional


class PromptTemplate:
    """A reusable prompt template with ``{variable}`` placeholders.

    Example
    -------
    >>> tpl = PromptTemplate("Translate the following to {language}: {text}")
    >>> tpl.format(language="French", text="Hello, world!")
    'Translate the following to French: Hello, world!'
    """

    # Matches {variable_name} placeholders (alphanumeric + underscores)
    _PLACEHOLDER_RE = re.compile(r"\{(\w+)\}")

    def __init__(self, template: str) -> None:
        self.template = template

    @property
    def variables(self) -> List[str]:
        """Return the list of variable names found in this template."""
        return self._PLACEHOLDER_RE.findall(self.template)

    def format(self, **kwargs: Any) -> str:
        """Substitute ``kwargs`` into the template and return the result.

        Raises
        ------
        KeyError
            If a required variable is missing from *kwargs*.
        """
        missing = set(self.variables) - set(kwargs)
        if missing:
            missing_list = ", ".join(sorted(f"{{{v}}}" for v in missing))
            raise KeyError(f"Missing template variables: {missing_list}")
        return self.template.format(**kwargs)

    def partial(self, **kwargs: Any) -> "PromptTemplate":
        """Return a new template with some variables pre-filled."""
        # Replace only the provided variables, leave the rest as-is
        result = self.template
        for key, value in kwargs.items():
            result = result.replace(f"{{{key}}}", str(value))
        return PromptTemplate(result)

    def __repr__(self) -> str:
        return f"PromptTemplate({self.template!r})"

    # ------------------------------------------------------------------
    # Convenience constructors
    # ------------------------------------------------------------------

    @classmethod
    def from_file(cls, path: str) -> "PromptTemplate":
        """Load a template from a plain-text file."""
        with open(path, encoding="utf-8") as fh:
            return cls(fh.read())

    @classmethod
    def chat_template(
        cls,
        system: Optional[str] = None,
        user_template: str = "{input}",
    ) -> "ChatPromptTemplate":
        """Convenience factory that returns a :class:`ChatPromptTemplate`."""
        return ChatPromptTemplate(
            system=system,
            user_template=PromptTemplate(user_template),
        )


class ChatPromptTemplate:
    """Combines a system message with a user-turn template.

    Example
    -------
    >>> tpl = ChatPromptTemplate(
    ...     system="You are a helpful assistant.",
    ...     user_template=PromptTemplate("Answer briefly: {question}"),
    ... )
    >>> msgs = tpl.format_messages(question="What is Python?")
    """

    def __init__(
        self,
        user_template: PromptTemplate,
        system: Optional[str] = None,
    ) -> None:
        self.system = system
        self.user_template = user_template

    def format_messages(self, **kwargs: Any) -> List[Dict[str, str]]:
        """Return a list of ``{"role": ..., "content": ...}`` dicts."""
        messages: List[Dict[str, str]] = []
        if self.system:
            messages.append({"role": "system", "content": self.system})
        messages.append(
            {"role": "user", "content": self.user_template.format(**kwargs)}
        )
        return messages
