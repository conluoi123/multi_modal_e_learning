from collections import defaultdict
from uuid import uuid4

MAX_MESSAGES_PER_CONVERSATION = 12

_conversations: dict[str, list[dict[str, str]]] = defaultdict(list)


def create_conversation_id() -> str:
    return str(uuid4())


def get_history(conversation_id: str) -> list[dict[str, str]]:
    return _conversations.get(conversation_id, [])


def add_message(conversation_id: str, role: str, content: str) -> None:
    _conversations[conversation_id].append(
        {
            "role": role,
            "content": content,
        }
    )

    if len(_conversations[conversation_id]) > MAX_MESSAGES_PER_CONVERSATION:
        _conversations[conversation_id] = _conversations[conversation_id][-MAX_MESSAGES_PER_CONVERSATION:]


def clear_history(conversation_id: str) -> None:
    _conversations.pop(conversation_id, None)