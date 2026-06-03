"""
Script test nhanh Quiz Generator — không cần khởi động server.
Chạy: python tests/test_quiz_quick.py
"""
import sys, os
sys.path.insert(0, os.path.abspath("."))

from backend.rag.retriever import retrive_context
from backend.rag.generator import get_llm
from backend.models.schemas import QuizRequest
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from backend.models.schemas import QuizResponse, QuizQuestion

# ── Tuỳ chỉnh ──────────────────────────────────────────────────
TOPIC       = "Tiêu chí đánh giá môn học"
N_QUESTIONS = 10
DIFFICULTY  = "medium"   # easy | medium | hard
# ───────────────────────────────────────────────────────────────

DIFFICULTY_MAP = {
    "easy":   "đơn giản, chỉ cần nhớ định nghĩa/khái niệm cơ bản",
    "medium": "trung bình, cần hiểu và áp dụng kiến thức",
    "hard":   "khó, cần phân tích, so sánh, hoặc suy luận sâu",
}

print(f"\n📚 Topic: {TOPIC}")
print(f"🎯 Số câu hỏi: {N_QUESTIONS}  |  Độ khó: {DIFFICULTY}\n")

# 1. RAG
print("1. Tìm tài liệu liên quan...")
chunks = retrive_context(TOPIC, k=5)
print(f"   → Tìm thấy {len(chunks)} chunks\n")

if not chunks:
    print("❌ Không tìm thấy tài liệu! Hãy upload PDF trước.")
    sys.exit(1)

context_text = "\n".join([c["text"] for c in chunks])

# 2. AI sinh quiz
print("2. AI đang sinh câu hỏi MCQ...")
llm = get_llm()
parser = JsonOutputParser(pydantic_object=QuizResponse)

prompt = PromptTemplate(
    template="""
Bạn là giảng viên đại học. Dựa vào TÀI LIỆU sau, hãy tạo {n_questions} câu hỏi trắc nghiệm (MCQ)
về chủ đề: "{topic}". Độ khó: {difficulty_desc}

TÀI LIỆU:
{context}

YÊU CẦU:
- Mỗi câu có đúng 4 lựa chọn: A, B, C, D
- Chỉ có 1 đáp án đúng
- Trường correct_answer chỉ chứa 1 ký tự: "A", "B", "C" hoặc "D"
- Giải thích ngắn gọn tại sao đáp án đó đúng (explanation)

{format_instructions}
""",
    input_variables=["topic", "n_questions", "difficulty_desc", "context"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

chain = prompt | llm | parser
result = chain.invoke({
    "topic": TOPIC,
    "n_questions": N_QUESTIONS,
    "difficulty_desc": DIFFICULTY_MAP[DIFFICULTY],
    "context": context_text,
})

# 3. In kết quả đẹp
print("\n" + "="*60)
print(f"✅ QUIZ: {TOPIC}")
print("="*60)

questions = result.get("questions", []) if isinstance(result, dict) else result.questions

for i, q in enumerate(questions, 1):
    q_data = q if isinstance(q, dict) else q.dict()
    print(f"\n📝 Câu {i}: {q_data['question']}")
    for j, choice in enumerate(q_data["choices"]):
        letter = chr(65 + j)   # A, B, C, D
        marker = "✅" if letter == q_data["correct_answer"] else "  "
        print(f"   {marker} {letter}. {choice}")
    print(f"   💡 Giải thích: {q_data['explanation']}")

print(f"\n{'='*60}")
print(f"Tổng: {len(questions)} câu hỏi được tạo thành công!")
