import os 
from dotenv import load_dotenv 
from langchain_google_genai import ChatGoogleGenerativeAI 
from langchain.prompts import PromptTemplate 

load_dotenv()

def get_llm(): 
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: 
        raise ValueError("Lỗi: Không có API key trong .env")
    
    return ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        google_api_key = api_key, 
        temperature=0.3
    )

def generate_answer(query: str, retrived_chunks: list[dict]) -> str: 
    '''
        Sinh câu trloi dựa trên retrived 
    '''
    context_text = ""
    for chunk in retrived_chunks: 
        source = chunk["metadata"].get("source", "Unknown")
        page = chunk["metadata"].get("page", "?")
        context_text += f"\n[Nguồn : {source} - Trang {page}]\n {chunk['text']}\n"

    # promt 
    template = """
    Bạn là một trợ lý AI học tập thông minh. Nhiệm vụ của bạn là trả lời câu hỏi dựa trên TÀI LIỆU CUNG CẤP dưới đây.
    
    QUY TẮC BẮT BUỘC:
    1. CHỈ sử dụng thông tin trong tài liệu để trả lời. TUYỆT ĐỐI Không tự bịa đặt thêm.
    2. Nếu tài liệu không chứa thông tin, hãy nói: "Xin lỗi, tôi không tìm thấy thông tin này trong tài liệu."
    3. Cuối câu trả lời, hãy ghi chú nguồn (Ví dụ: Nguồn: sample.pdf - Trang X).
    
    TÀI LIỆU CUNG CẤP:
    {context}
    
    CÂU HỎI CỦA NGƯỜI DÙNG: {question}
    
    TRẢ LỜI:
    """
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=template
    )

    final_prompt = prompt.format(context=context_text, question=query)

    llm = get_llm()
    print(f"Đang gửi câu hỏi cho Gemini suy nghĩ...")
    res = llm.invoke(final_prompt)
    return res.content

if __name__ == "__main__":
    from backend.rag.retriever import retrive_context
    
    test_query = "Nhóm cần làm mấy tiêu chí, tiêu chí báo cáo tiếng Việt bao nhiêu điểm?"
    
    print("\n1. Đang tìm kiếm tài liệu trong DB...")
    chunks = retrive_context(test_query, k=3)
    
    print("\n2. Đang sinh câu trả lời bằng Gemini...")
    answer = generate_answer(test_query, chunks)
    
    print("\n=> CÂU TRẢ LỜI CỦA AI:")
    print("="*60)
    print(answer)