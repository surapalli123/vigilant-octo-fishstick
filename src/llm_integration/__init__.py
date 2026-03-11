"""
LLM Integration Toolkit
=======================
A provider-agnostic framework for building applications with Large Language Models.
"""

from .client import LLMClient, Message, Role
from .prompt import PromptTemplate
from .chain import ConversationChain

__version__ = "0.1.0"
__all__ = ["LLMClient", "Message", "Role", "PromptTemplate", "ConversationChain"]
