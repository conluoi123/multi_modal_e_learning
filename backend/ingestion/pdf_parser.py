import fitz  # PyMuPDF
import os

def parse_pdf(file_path: str) -> list[dict]: 
    """
        Đọc file PDF và trích xuất băn bản từng trang 
        Args: 
            file_path: Đường dẫn file PDF
        Returns:
            List of dict, mỗi dict chứa thông tin: page, text
    """

    if not os.path.exists(file_path): 
        raise FileNotFoundError(f"Không tìm thấy file: {file_path}")

    print(f"Đang xử lý PDF: {file_path}")
    doc = fitz.open(file_path)
    pages_data = []

    for page_num in range(len(doc)): 
        page = doc[page_num]
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

    print(f"Đã trích xuất được {len(pages_data)} trang có chữ")
    return pages_data 

# test 
if __name__ =="__main__": 
    test_pdf = "data/raw/sample.pdf"
    if os.path.exists(test_pdf): 
        res = parse_pdf(test_pdf)
        if res: 
            print(f"\n Nội dung trang đầu tiên {res[2]['metadata']['page']}")
            print("=" * 60)
            print(res[2]['text'][:500]) # in 500 ký tự đầu tiên
            print("\n Tổng số trang có chữ: ", len(res))
    else: 
        print(f"Vui lòng copy một file pdf có chữ để test")
        
    