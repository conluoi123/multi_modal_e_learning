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

from pydantic.v1 import BaseModel as BaseModelV1

class SlideContent(BaseModelV1): 
    title: str 
    bullet_points: List[str]
    speaker_notes: str

class SlidePresentation(BaseModelV1): 
    slides: List[SlideContent]

class SlideRequest(BaseModel): 
    topic: str 
    n_slides: int = 5 
    template_name: str = "corporate"
    