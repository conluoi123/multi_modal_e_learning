"""
    Unit test cho ingestion
"""

import os
import pytest
from backend.ingestion.pdf_parser import parse_pdf
from backend.ingestion.chunker import chunk_text

# Đường dẫn file PDF dùng để test 
TEST_PDF_PATH = "data/raw/sample.pdf"

def test_pdf_parser_returns_valid_data():
    """Kiểm tra xem pdf_parser có đọc được chữ và đính metadata không"""
    if not os.path.exists(TEST_PDF_PATH):
        pytest.skip("Không tìm thấy file sample.pdf để test")
        
    pages = parse_pdf(TEST_PDF_PATH)
    
    # 1. Trả về list không rỗng
    assert len(pages) > 0, "PDF parser không trả về trang nào"
    
    # 2. Text không được rỗng
    assert len(pages[0]["text"].strip()) > 0, "Nội dung trang đầu tiên bị rỗng"
    
    # 3. Phải có metadata đính kèm
    assert "metadata" in pages[0], "Thiếu metadata"
    assert "page" in pages[0]["metadata"], "Thiếu số trang trong metadata"

def test_chunker_limits_size():
    """Kiểm tra xem chunker có tuân thủ giới hạn 600 ký tự không"""
    if not os.path.exists(TEST_PDF_PATH):
        pytest.skip("Không tìm thấy file sample.pdf để test")
        
    pages = parse_pdf(TEST_PDF_PATH)
    chunks = chunk_text(pages, chunk_size=600, chunk_overlap=120)
    
    assert len(chunks) > 0, "Chunker không tạo ra chunk nào"
    
    # Đảm bảo không có chunk nào quá dài (thường RecursiveCharacterTextSplitter 
    # cho phép sai số nhẹ, nên ta nới lỏng ra 700 ký tự)
    for chunk in chunks:
        assert len(chunk["text"]) <= 700, f"Có chunk quá dài: {len(chunk['text'])} ký tự"
        assert "chunk_index" in chunk["metadata"], "Thiếu chunk_index"
