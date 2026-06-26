import json
import re
from langchain_core.prompts import PromptTemplate
from backend.rag.generator import get_llm
from backend.models.schemas import QuizSetLLM

evaluator_template = """
Bạn là một Chuyên gia Khảo thí (Assessment Expert) cấp cao tại một trường Đại học. 
Nhiệm vụ của bạn là thẩm định khắt khe một câu hỏi trắc nghiệm (MCQ) do hệ thống AI khác sinh ra.

[NGỮ CẢNH TỜ TÀI LIỆU (CONTEXT)]: 
{context}

[CÂU HỏI TRẮc NGHIỆM ĐƯỢC SINH RA]:
Câu hỏi: {question}
Các lựa chọn: {options}
Đáp án đúng: {correct_answer}

[NHIỆM VỤ ĐÁNH GIÁ 4 CHIỀU]:
Bạn hãy phân tích sâu câu hỏi này theo 4 tiêu chí sau. Thang điểm cho mỗi tiêu chí là từ 1 đến 5 (5 là xuất sắc, 1 là tệ hại):

1. Độ bám sát (Context Relevance): Câu hỏi có hoàn toàn dựa vào [NGỮ CẢNH] không, hay sử dụng kiến thức ngoài lề?
2. Độ chính xác của đáp án (Answer Correctness): Đáp án đúng ({correct_answer}) có thực sự đúng và không thể chối cãi dựa trên ngữ cảnh không?
3. Chất lượng đáp án nhiễu (Distractor Plausibility): Các đáp án sai có đủ độ khó để "đánh lừa" học sinh không học bài không? Chúng có cùng trường từ vựng/chuyên ngành với đáp án đúng không?
4. Không có manh mối ngữ pháp (Grammar/Clue Independence): Câu hỏi có lỡ để lộ manh mối ngữ pháp (ví dụ: số ít/số nhiều, từ khóa lặp lại) giúp học sinh dễ dàng đoán mò ra đáp án đúng không?

[YÊU CẦU ĐẦU RA]:
Hãy suy luận từng bước và xuất kết quả DUY NHẤT dưới dạng JSON theo cấu trúc sau:
{{
    "analysis": {{
        "relevance_analysis": "<Phân tích tiêu chí 1>",
        "correctness_analysis": "<Phân tích tiêu chí 2>",
        "distractor_analysis": "<Phân tích tiêu chí 3>",
        "clue_analysis": "<Phân tích tiêu chí 4>"
    }},
    "scores": {{
        "relevance": <1-5>,
        "correctness": <1-5>,
        "distractor": <1-5>,
        "clue_independence": <1-5>
    }},
    "total_score": <Tổng điểm 4 tiêu chí (tối đa 20)>,
    "verdict": "<'Khuyên dùng' (nếu tổng >= 16) / 'Cần sửa' (nếu ngược lại)>",
    "suggested_revision": "<Viết lại toàn bộ câu hỏi và 4 đáp án sao cho hoàn hảo nhất (Nếu câu hỏi đã hoàn hảo, hãy giữ nguyên)>"
}}
"""

prompt = PromptTemplate(
    template=evaluator_template,
    input_variables=["context", "question", "options", "correct_answer"]
)

def _extract_content(response) -> str:
    """
    Gemini đôi khi trả về response.content là list các content block thay vì string.
    Hàm này đảm bảo luôn trả về string.
    """
    content = response.content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                parts.append(block.get("text", ""))
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts)
    return str(content)

def evaluate_quiz_question(context: str, question: dict) -> dict:
    """
    Đánh giá 1 câu hỏi MCQ. question là dictionary dạng:
    {
      "question": "...",
      "options": ["A. ...", "B. ..."],
      "answer": "..."
    }
    """
    llm = get_llm()
    
    final_prompt = prompt.format(
        context=context,
        question=question["question"],
        options=str(question["options"]),
        correct_answer=question["answer"]
    )
    
    try:
        response = llm.invoke(final_prompt)
        raw_text = _extract_content(response).strip()

        # Xóa code fence nếu có
        raw_json = re.sub(r"```json\s*|```\s*", "", raw_text).strip()

        # Tìm JSON block đầu tiên trong response (tránh bị prefix text làm nhiễu)
        match = re.search(r"\{.*\}", raw_json, re.DOTALL)
        if not match:
            raise ValueError("Không tìm thấy JSON hợp lệ trong response")

        result = json.loads(match.group())

        # Đảm bảo luôn có total_score
        if "total_score" not in result:
            scores = result.get("scores", {})
            result["total_score"] = sum(scores.values()) if scores else 10

        return result
    except Exception as e:
        print(f"Lỗi chấm điểm: {e}")
        return {
            "total_score": 0,
            "verdict": "Lỗi hệ thống chấm điểm",
            "suggested_revision": "Không thể chấm điểm"
        }
