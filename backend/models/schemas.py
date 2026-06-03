from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field
from pydantic.v1 import BaseModel as BaseModelV1


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    doc_id: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    citations: List[Dict[str, str]]

class IngestResponse(BaseModel):
    status: str
    doc_id: str
    filename: str
    total_pages: int
    total_chunks_saved: int
    duplicate: bool = False

class DocumentInfo(BaseModel):
    doc_id: str
    filename: str
    chunk_count: int


class DocumentsResponse(BaseModel):
    documents: List[DocumentInfo]


class SlideContent(BaseModelV1):
    title: str
    bullet_points: List[str]
    speaker_notes: str


class SlidePresentation(BaseModelV1):
    slides: List[SlideContent]


class SlideRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=200)
    n_slides: int = Field(default=5, ge=1, le=20)
    template_name: Literal["academic", "corporate", "minimal"] = "corporate"
    grade_level: str = Field(default="Đại học", min_length=2, max_length=50)
    difficulty: Literal["basic", "standard", "advanced"] = "standard"
    mode: Literal["standard"] = "standard"
    language: Literal["vi", "en"] = "vi"
    include_speaker_notes: bool = True
    doc_id: Optional[str] = None


class SlideGenerateResponse(BaseModel):
    status: str
    filename: str
    file_path: str
    download_url: str
    slide_count: int
    citations: List[Dict[str, str]]

class QuizRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=200)
    n_questions: int = Field(default=5, ge=1, le=20)
    difficulty: Literal["basic", "standard", "advanced"] = "standard"
    doc_id: Optional[str] = None


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer: str
    explanation: str


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]
    citations: List[Dict[str, str]]


class QuizQuestionLLM(BaseModelV1):
    question: str
    options: List[str]
    answer: str
    explanation: str


class QuizSetLLM(BaseModelV1):
    questions: List[QuizQuestionLLM]

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    conversation_id: Optional[str] = None
    doc_id: Optional[str] = None


class ChatResponse(BaseModel):
    conversation_id: str
    answer: str
    citations: List[Dict[str, str]]
    history: List[ChatMessage]

class VoiceChatResponse(ChatResponse):
    transcribed_text: str


class ChatClearResponse(BaseModel):
    status: Literal["success"]
    conversation_id: str
    cleared: bool
    message: str

class ChatHistoryResponse(BaseModel):
    conversation_id: str
    history: List[ChatMessage]
    message_count: int
