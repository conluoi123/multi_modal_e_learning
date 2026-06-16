"""
Tầng sinh câu trả lời cho RAG.

Nhiệm vụ:
- Khởi tạo mô hình Gemini.
- Tạo prompt từ các chunk đã truy xuất.
- Sinh câu trả lời dựa trên tài liệu và kèm nguồn trích dẫn.
"""

from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from backend.core.config import GEMINI_API_KEY, GEMINI_MODEL


_NO_CONTEXT_ANSWER = "Xin lỗi, tôi không tìm thấy thông tin này trong tài liệu."

_llm: ChatGoogleGenerativeAI | None = None


def get_llm() -> ChatGoogleGenerativeAI:
    """
    Khởi tạo và cache mô hình Gemini.
    """
    global _llm

    if not GEMINI_API_KEY:
        raise ValueError("Thiếu GEMINI_API_KEY. Vui lòng cấu hình trong file .env.")

    if _llm is None:
        print(f"Đang khởi tạo mô hình Gemini: {GEMINI_MODEL}")
        _llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            google_api_key=GEMINI_API_KEY,
            temperature=0.3,
        )

    return _llm


def format_context(retrieved_chunks: list[dict]) -> str:
    """
    Chuyển các chunk đã truy xuất thành context để đưa vào prompt.
    """
    context_parts = []

    for chunk in retrieved_chunks:
        metadata = chunk.get("metadata", {})
        source = metadata.get("source", "Unknown")
        page = metadata.get("page", "?")
        text = chunk.get("text", "").strip()

        if not text:
            continue

        context_parts.append(
            f"[Nguồn: {source} - Trang {page}]\n{text}"
        )

    return "\n\n".join(context_parts)


def generate_answer(query: str, retrieved_chunks: list[dict]) -> str:
    """
    Sinh câu trả lời dựa trên câu hỏi và các chunk tài liệu đã truy xuất.
    """
    context_text = format_context(retrieved_chunks)

    if not context_text:
        return _NO_CONTEXT_ANSWER

    template = """
Bạn là một trợ lý AI học tập thông minh.

Nhiệm vụ:
Trả lời câu hỏi của người dùng dựa trên TÀI LIỆU CUNG CẤP.

Quy tắc bắt buộc:
1. Chỉ sử dụng thông tin trong tài liệu được cung cấp.
2. Không tự bịa thêm thông tin ngoài tài liệu.
3. Nếu tài liệu không có đủ thông tin, hãy nói rõ là không tìm thấy thông tin trong tài liệu.
4. Trả lời bằng tiếng Việt, rõ ràng, có cấu trúc.
5. Cuối câu trả lời phải ghi nguồn theo định dạng: Nguồn: tên_file - Trang X.

TÀI LIỆU CUNG CẤP:
{context}

CÂU HỎI:
{question}

TRẢ LỜI:
""".strip()

    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=template,
    )

    final_prompt = prompt.format(context=context_text, question=query)

    llm = get_llm()
    print("Đang gửi câu hỏi kèm ngữ cảnh tài liệu cho Gemini...")
    response = llm.invoke(final_prompt)

    return response.content

def format_chat_history(history: list[dict[str, str]]) -> str:
    if not history:
        return "Chưa có lịch sử hội thoại."

    lines = []
    for message in history:
        role = "Người dùng" if message["role"] == "user" else "Trợ lý"
        lines.append(f"{role}: {message['content']}")

    return "\n".join(lines)


def generate_chat_answer(
    question: str,
    retrieved_chunks: list[dict],
    history: list[dict[str, str]],
) -> str:
    context_text = format_context(retrieved_chunks)

    if not context_text:
        return _NO_CONTEXT_ANSWER

    history_text = format_chat_history(history)

    template = """
Bạn là một trợ lý AI học tập thông minh.

Nhiệm vụ:
Trả lời câu hỏi hiện tại của người dùng dựa trên TÀI LIỆU CUNG CẤP và LỊCH SỬ HỘI THOẠI.

Quy tắc bắt buộc:
1. Chỉ dùng tài liệu được cung cấp để trả lời nội dung kiến thức.
2. Có thể dùng lịch sử hội thoại để hiểu ngữ cảnh câu hỏi.
3. Không bịa thông tin ngoài tài liệu.
4. Nếu tài liệu không đủ thông tin, hãy nói rõ là không tìm thấy trong tài liệu.
5. Trả lời bằng tiếng Việt.
6. Cuối câu trả lời ghi nguồn theo định dạng: Nguồn: tên_file - Trang X.
7. ĐỊNH DẠNG TOÁN HỌC: Mọi công thức Toán học, Vật lý phải được viết bằng định dạng LaTeX (bọc trong $...$ hoặc $$...$$).
8. ĐỊNH DẠNG BIỂU ĐỒ: Nếu biểu diễn số liệu bằng biểu đồ, BẮT BUỘC trả về chuẩn JSON bọc trong thẻ markdown `recharts` (Ví dụ: ```recharts {{ "type": "LineChart", "data": [...] }} ```). Tuyệt đối không trả về raw JSON.

LỊCH SỬ HỘI THOẠI:
{history}

TÀI LIỆU CUNG CẤP:
{context}

CÂU HỎI HIỆN TẠI:
{question}

TRẢ LỜI:
""".strip()

    prompt = PromptTemplate(
        input_variables=["history", "context", "question"],
        template=template,
    )

    final_prompt = prompt.format(
        history=history_text,
        context=context_text,
        question=question,
    )

    llm = get_llm()
    print("Đang gửi câu hỏi chat kèm lịch sử hội thoại cho Gemini...")
    response = llm.invoke(final_prompt)

    return response.content

def generate_chat_answer_stream(
    question: str,
    retrieved_chunks: list[dict],
    history: list[dict[str, str]],
):
    context_text = format_context(retrieved_chunks)

    if not context_text:
        yield _NO_CONTEXT_ANSWER
        return

    history_text = format_chat_history(history)

    template = """
Bạn là một trợ lý AI học tập thông minh.

Nhiệm vụ:
Trả lời câu hỏi hiện tại của người dùng dựa trên TÀI LIỆU CUNG CẤP và LỊCH SỬ HỘI THOẠI.

Quy tắc bắt buộc:
1. Chỉ dùng tài liệu được cung cấp để trả lời nội dung kiến thức.
2. Có thể dùng lịch sử hội thoại để hiểu ngữ cảnh câu hỏi.
3. Không bịa thông tin ngoài tài liệu.
4. Nếu tài liệu không đủ thông tin, hãy nói rõ là không tìm thấy trong tài liệu.
5. Trả lời bằng tiếng Việt.
6. Cuối câu trả lời ghi nguồn theo định dạng: Nguồn: tên_file - Trang X.
7. ĐỊNH DẠNG TOÁN HỌC: Mọi công thức Toán học, Vật lý phải được viết bằng định dạng LaTeX (bọc trong $...$ hoặc $$...$$).
8. ĐỊNH DẠNG BIỂU ĐỒ: Nếu biểu diễn số liệu bằng biểu đồ, BẮT BUỘC trả về chuẩn JSON bọc trong thẻ markdown `recharts` (Ví dụ: ```recharts {{ "type": "LineChart", "data": [...], "xKey": "day", "lineKey": "temperature" }} ```). Tuyệt đối không trả về raw JSON.

LỊCH SỬ HỘI THOẠI:
{history}

TÀI LIỆU CUNG CẤP:
{context}

CÂU HỎI HIỆN TẠI:
{question}

TRẢ LỜI:
""".strip()

    prompt = PromptTemplate(
        input_variables=["history", "context", "question"],
        template=template,
    )

    final_prompt = prompt.format(
        history=history_text,
        context=context_text,
        question=question,
    )

    llm = get_llm()
    print("Đang stream câu hỏi chat cho Gemini...")
    
    # Dùng llm.stream() để yield từng chunk văn bản
    for chunk in llm.stream(final_prompt):
        if chunk.content:
            yield chunk.content


if __name__ == "__main__":
    from backend.rag.retriever import retrieve_context

    test_query = "Nhóm cần làm mấy tiêu chí, tiêu chí báo cáo tiếng Việt bao nhiêu điểm?"

    print("\n1. Đang truy xuất các đoạn tài liệu liên quan...")
    chunks = retrieve_context(test_query, k=3)

    print("\n2. Đang sinh câu trả lời bằng Gemini...")
    answer = generate_answer(test_query, chunks)

    print("\n=> CÂU TRẢ LỜI CỦA AI:")
    print("=" * 60)
    print(answer)