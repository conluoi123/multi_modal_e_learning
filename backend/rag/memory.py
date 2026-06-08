import json
import os
from collections import defaultdict
from uuid import uuid4
from datetime import datetime

MAX_MESSAGES_PER_CONVERSATION = 12
DATA_FILE = os.path.join("data", "chat_history.json")

# Structure: { conv_id: { "updated_at": timestamp, "messages": [...] } }
_conversations: dict = {}

def load_history():
    global _conversations
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                _conversations = json.load(f)
        except Exception:
            _conversations = {}

def save_history():
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(_conversations, f, ensure_ascii=False, indent=2)

load_history()

def create_conversation_id() -> str:
    return str(uuid4())

def get_history(conversation_id: str) -> list[dict[str, str]]:
    if conversation_id in _conversations:
        return _conversations[conversation_id].get("messages", [])
    return []

def get_all_conversations() -> list[dict]:
    result = []
    for conv_id, data in _conversations.items():
        messages = data.get("messages", [])
        if not messages:
            continue
        # Lấy tin nhắn đầu tiên của user làm title
        title = "Cuộc trò chuyện mới"
        for msg in messages:
            if msg["role"] == "user":
                title = msg["content"][:40] + ("..." if len(msg["content"]) > 40 else "")
                break
        
        result.append({
            "conversation_id": conv_id,
            "title": title,
            "updated_at": data.get("updated_at", "")
        })
    # Sort by updated_at descending
    result.sort(key=lambda x: x["updated_at"], reverse=True)
    return result

def add_message(conversation_id: str, role: str, content: str) -> None:
    if conversation_id not in _conversations:
        _conversations[conversation_id] = {
            "updated_at": "",
            "messages": []
        }
    
    _conversations[conversation_id]["messages"].append({
        "role": role,
        "content": content,
    })
    
    _conversations[conversation_id]["updated_at"] = datetime.now().isoformat()

    msgs = _conversations[conversation_id]["messages"]
    if len(msgs) > MAX_MESSAGES_PER_CONVERSATION:
        _conversations[conversation_id]["messages"] = msgs[-MAX_MESSAGES_PER_CONVERSATION:]
        
    save_history()

def clear_history(conversation_id: str) -> None:
    if conversation_id in _conversations:
        del _conversations[conversation_id]
        save_history()