import os
import base64
from typing import List, Dict
from dotenv import load_dotenv

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

# conffig api 
llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.0,
    timeout=30,
    max_retries=3
)

def _pil_image_to_base64(image) -> str:
    """Chuyển PIL Image thành Base64 JPEG"""
    import io
    buffered = io.BytesIO()
    # Nén nhẹ để tăng tốc độ truyền
    image.save(buffered, format="JPEG", quality=85)
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

def caption_image_with_gemini(image) -> str:
    """Gọi Gemini Vision để lấy mô tả hình ảnh/biểu đồ."""
    b64_img = _pil_image_to_base64(image)
    vision_prompt = (
        "Đây là một hình ảnh/biểu đồ trích xuất từ tài liệu PDF. "
        "Hãy mô tả chi tiết nội dung của nó, bao gồm số liệu, xu hướng (nếu là biểu đồ), "
        "hoặc các thông tin quan trọng (nếu là hình ảnh sơ đồ). "
        "Chỉ trả về mô tả, không cần lời chào."
    )
    message = HumanMessage(
        content=[
            {"type": "text", "text": vision_prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}}
        ]
    )
    try:
        response = llm.invoke([message])
        raw = response.content
        if isinstance(raw, list):
            text = " ".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in raw)
        else:
            text = str(raw)
        return text.strip()
    except Exception as e:
        print(f"     [LỖI GEMINI] Không thể lấy mô tả ảnh: {e}")
        return "[Hình ảnh/Biểu đồ: Không thể trích xuất do lỗi API]"


def parse_pdf(file_path: str) -> list[dict]: 
    """
    Đọc file PDF bằng Docling, giữ nguyên Markdown, Bảng, Công thức Toán học.
    Tự động cô lập Hình ảnh/Biểu đồ và gửi cho Gemini mô tả, sau đó chèn lại vào văn bản.
    """
    if not os.path.exists(file_path): 
        raise FileNotFoundError(f"Không tìm thấy file: {file_path}")

    print(f"Đang xử lý PDF bằng Docling (Local) + Gemini Vision (Fallback): {file_path}")
    
    # Cấu hình Docling để extract hình ảnh
    pipeline_options = PdfPipelineOptions()
    pipeline_options.generate_picture_images = True
    
    doc_converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )
    
    # Phân tích PDF (Toàn bộ chạy Local)
    print("  -> Docling đang phân tích Layout, Text, Table, Formula...")
    conv_res = doc_converter.convert(file_path)
    doc = conv_res.document
    
    # Gom text theo từng trang để tương thích với chunker (metadata có 'page')
    pages_text = {} # dict lưu text theo số trang: {page_no: "text"}
    
    print("  -> Đang duyệt qua các thành phần của tài liệu...")
    for item, level in doc.iterate_items():
        # Tìm xem item này thuộc trang nào
        page_no = 1
        if item.prov and len(item.prov) > 0:
            page_no = item.prov[0].page_no
            
        if page_no not in pages_text:
            pages_text[page_no] = ""
            
        # Xử lý theo loại Item
        if type(item).__name__ == "PictureItem":
            print(f"     [AI VISION] Tìm thấy ảnh/biểu đồ ở trang {page_no}. Đang gọi Gemini...")
            image = item.get_image(doc)
            if image:
                caption = caption_image_with_gemini(image)
                pages_text[page_no] += f"\n\n--- HÌNH ẢNH/BIỂU ĐỒ ---\n{caption}\n------------------------\n\n"
            else:
                pages_text[page_no] += "\n[Hình ảnh không thể render]\n"
        
        elif hasattr(item, "export_to_markdown"):
            pages_text[page_no] += f"\n{item.export_to_markdown()}\n"
            
        elif hasattr(item, "text") and item.text:
            pages_text[page_no] += f"{item.text}\n"

    # Định dạng lại thành list[dict] như hàm cũ
    pages_data = []
    for page_no, text in sorted(pages_text.items()):
        if not text.strip():
            continue
        pages_data.append({
           "text": text.strip(),
           "metadata": {
            "source": os.path.basename(file_path), 
            "page": page_no
           }
        })

    print(f"Đã xử lý xong {len(pages_data)} trang có nội dung.")
    return pages_data 

if __name__ =="__main__": 
    test_pdf = "data/raw/2310.03684v4_Smooth_LLM.pdf"
    if os.path.exists(test_pdf): 
        res = parse_pdf(test_pdf)
        if res: 
            print(f"\n Nội dung trang đầu tiên ({res[0]['metadata']['page']})")
            print("=" * 60)
            print(res[0]['text'])
    else: 
        print(f"Vui lòng copy một file pdf vào thư mục data/raw/ để test")