import fitz  # PyMuPDF
import os
import base64
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

# Khởi tạo mô hình Vision của Google (Gemini 1.5 Flash)
llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.0
)

def _pixmap_to_base64(pix) -> str:
    """Chuyển đổi PyMuPDF Pixmap sang chuỗi Base64 (PNG)"""
    img_bytes = pix.tobytes("png")
    return base64.b64encode(img_bytes).decode("utf-8")

def parse_pdf(file_path: str) -> list[dict]: 
    """
        Đọc file PDF bằng phương pháp Vision RAG.
        Chụp ảnh từng trang và nhờ Gemini 1.5 trích xuất chữ, LaTeX và mô tả biểu đồ.
    """
    if not os.path.exists(file_path): 
        raise FileNotFoundError(f"Không tìm thấy file: {file_path}")

    print(f"Đang xử lý PDF bằng AI Vision (Multi-Modal): {file_path}")
    doc = fitz.open(file_path)
    pages_data = []

    vision_prompt = """
    Bạn là một hệ thống trích xuất tài liệu (Document Parser) xuất sắc.
    Hãy đọc hình ảnh trang tài liệu này và trích xuất lại toàn bộ nội dung của nó.
    YÊU CẦU NGHIÊM NGẶT:
    1. Trích xuất văn bản y hệt bản gốc.
    2. [QUAN TRỌNG] Nếu có Công thức Toán học/Vật lý/Hóa học: BẮT BUỘC viết lại bằng mã LaTeX (Dùng dấu $...$ hoặc $$...$$).
    3. [QUAN TRỌNG] Nếu có Biểu đồ, Đồ thị, Hình ảnh: ĐỪNG BỎ QUA! Hãy viết một đoạn mô tả chi tiết biểu đồ đó nói về cái gì, các số liệu quan trọng, xu hướng của đồ thị, hoặc trích xuất số liệu thành bảng Markdown.
    4. Không cần nói "Dưới đây là nội dung...", hãy đi thẳng vào việc trích xuất văn bản.
    """

    for page_num in range(len(doc)): 
        print(f"  -> Đang phân tích trang {page_num + 1}/{len(doc)}...")
        page = doc[page_num]
        
        # Scale ảnh lên x2 để nét hơn (Giúp AI đọc chữ nhỏ dễ hơn)
        zoom_matrix = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=zoom_matrix)
        b64_img = _pixmap_to_base64(pix)
        
        # Gửi cả Text Prompt và Image Base64 cho Gemini
        message = HumanMessage(
            content=[
                {"type": "text", "text": vision_prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_img}"}}
            ]
        )
        
        try:
            response = llm.invoke([message])
            text = response.content
        except Exception as e:
            print(f"     [LỖI API] Không thể dùng AI ở trang {page_num+1}: {e}")
            print("     [FALLBACK] Chuyển về chế độ đọc text tĩnh cơ bản.")
            text = page.get_text("text")

        if not text.strip(): 
            continue
            
        pages_data.append({
           "text": text,
           "metadata": {
            "source": os.path.basename(file_path), 
            "page": page_num + 1
           }
        })

    print(f"Đã trích xuất xong {len(pages_data)} trang bằng Vision RAG")
    return pages_data 

# test 
if __name__ =="__main__": 
    test_pdf = "data/raw/2310.03684v4_Smooth_LLM.pdf"
    if os.path.exists(test_pdf): 
        res = parse_pdf(test_pdf)
        if res: 
            print(f"\n Nội dung trang đầu tiên ({res[0]['metadata']['page']})")
            print("=" * 60)
            print(res[0]['text']) # In hết ra để test xem có LaTeX/Biểu đồ không
    else: 
        print(f"Vui lòng copy một file pdf có biểu đồ/công thức toán vào thư mục data/raw/ để test")
        
    