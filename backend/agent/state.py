from typing import TypedDict, List, Dict, Any
from pydantic import BaseModel 

class AgentState(TypedDict): 
    messages: List[dict]
    intent: str 
    docs: List[str]
    quiz_data: Dict[str, Any]
    quiz_score: int
    quiz_attempts: int