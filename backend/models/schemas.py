"""
    Định nghĩa các Request / Response schemas cho toàn bộ API
"""

from pydantic import BaseModel
from typing import List, Dict, Optional


# ─── RAG Query ────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str
    citations: List[Dict[str, str]]


# ─── Slide Generator ──────────────────────────────────────────

class SlideContent(BaseModel):
    title: str
    bullet_points: List[str]
    speaker_notes: str

class SlidePresentation(BaseModel):
    slides: List[SlideContent]

class SlideRequest(BaseModel):
    topic: str
    n_slides: int = 5
    theme: str = "corporate"       # academic | corporate | minimal
    author: str = ""
    subtitle: str = ""

class SlideResponse(BaseModel):
    file_url: str                  # URL để download file .pptx
    filename: str
    n_slides: int


# ─── Quiz Generator ───────────────────────────────────────────

class QuizRequest(BaseModel):
    topic: str
    n_questions: int = 5           # Số câu hỏi MCQ
    difficulty: str = "medium"     # easy | medium | hard

class QuizQuestion(BaseModel):
    question: str
    choices: List[str]             # 4 đáp án A/B/C/D
    correct_answer: str            # Chử cái: "A", "B", "C", hoặc "D"
    explanation: str               # Giải thích tại sao đáp án đó đúng

class QuizResponse(BaseModel):
    topic: str
    questions: List[QuizQuestion]