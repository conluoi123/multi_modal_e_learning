"""
    Định nghĩa các req, res 
"""

from pydantic import BaseModel 
from typing import List , Dict , Optional

class QueryRequest(BaseModel): 
    question: str

class QueryResponse(BaseModel): 
    answer: str 
    citations: List[Dict[str, str]]
