from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from backend.models.schemas import QuizSetLLM
from backend.rag.generator import get_llm


def generate_quiz(
    topic: str,
    context: str,
    n_questions: int = 5,
    difficulty: str = "standard",
) -> QuizSetLLM:
    llm = get_llm()
    parser = JsonOutputParser(pydantic_object=QuizSetLLM)

    template = """
Bạn là một chuyên gia thiết kế câu hỏi trắc nghiệm cho hệ thống e-learning.

Hãy tạo {n_questions} câu hỏi trắc nghiệm về chủ đề: {topic}.

Mức độ: {difficulty}

Tài liệu tham khảo:
{context}

Yêu cầu:
1. Chỉ sử dụng thông tin có trong tài liệu tham khảo.
2. Không bịa thêm kiến thức ngoài tài liệu.
3. Mỗi câu hỏi có đúng 4 lựa chọn.
4. Trường answer phải là nội dung đúng, không chỉ là A/B/C/D.
5. explanation giải thích ngắn gọn vì sao đáp án đúng.
6. Nếu difficulty là "basic", câu hỏi nên kiểm tra hiểu biết cơ bản.
7. Nếu difficulty là "advanced", câu hỏi nên yêu cầu phân tích hoặc so sánh.

Yêu cầu định dạng:
{format_instructions}
"""

    prompt = PromptTemplate(
        template=template,
        input_variables=["topic", "context", "n_questions", "difficulty"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    chain = prompt | llm | parser

    print(f"Đang tạo {n_questions} câu hỏi quiz về '{topic}'...")
    result_dict = chain.invoke(
        {
            "topic": topic,
            "context": context,
            "n_questions": n_questions,
            "difficulty": difficulty,
        }
    )

    return QuizSetLLM(**result_dict)