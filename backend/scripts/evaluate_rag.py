import sys
import json 
import os
from pathlib import Path
import nest_asyncio
from dotenv import load_dotenv

load_dotenv()
nest_asyncio.apply()

# Thêm đường dẫn thư mục gốc vào hệ thống để import được các module backend
sys.path.append(str(Path(__file__).resolve().parents[2]))

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings

# Import các hàm RAG hiện tại của hệ thống để test
from backend.rag.retriever import retrieve_context
from backend.rag.generator import generate_answer
from backend.core.config import GEMINI_API_KEY, GEMINI_MODEL, EMBEDDING_MODEL

api_key = os.getenv("GROQ_API_KEY")
def run_evaluation():
    print(" BẮT ĐẦU QUÁ TRÌNH CHẤM ĐIỂM RAG (RAGAS EVALUATION)  ")
    
    # dùng api groq
    print("Khởi tạo Giám khảo Groq (Llama-3-70B)...")
    judge_llm = ChatGroq(
        model_name="llama-3.3-70b-versatile", 
        api_key=api_key,
        temperature=0.0
    )

    judge_embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    # load dữ liệu câu hỏi từ json 
    project_root = Path(__file__).resolve().parents[2]
    easy_json_path = project_root / "data" / "eval" / "datasets" / "easy_questions.json" 
    hard_json_path = project_root / "data" / "eval" / "datasets" / "hard_questions.json" 



    # test easy
    with open(easy_json_path, "r", encoding="utf-8") as f: 
        easy_test_questions = json.load(f)
    
    # test hard
    with open(hard_json_path, "r", encoding="utf-8") as f: 
        hard_test_questions = json.load(f)


    questions = []
    answers = []
    contexts = []
    ground_truths = []

    print("\nĐang lấy câu trả lời từ hệ thống RAG hiện tại...")
    for item in easy_test_questions:
        q = item["question"]
        print(f"  - Hỏi: {q}")
        
        # Gọi RAG của chúng ta để lấy Context và Answer
        retrieved_chunks = retrieve_context(q, k=3)
        ans = generate_answer(q, retrieved_chunks)
        
        # Trích xuất đoạn text từ chunks
        ctx_texts = [chunk["text"] for chunk in retrieved_chunks]
        
        questions.append(q)
        answers.append(ans)
        contexts.append(ctx_texts)
        ground_truths.append(item["ground_truth"])

    # 3. Đóng gói dữ liệu thành Dataset chuẩn của HuggingFace
    data = {
        "question": questions,
        "answer": answers,
        "contexts": contexts,
        "ground_truth": ground_truths,
    }
    dataset = Dataset.from_dict(data)

    # 4. Tiến hành chấm điểm
    print("\n Đang nhờ AI chấm điểm các chỉ số... (Có thể mất vài chục giây)")
    result = evaluate(
        dataset,
        metrics=[
            faithfulness,
            # answer_relevancy,
            context_precision,
            context_recall,
        ],
        llm=judge_llm,
        embeddings=judge_embeddings,
    )

    print("\nKẾT QUẢ ĐÁNH GIÁ (BASELINE METRICS)")
    print("=" * 50)
    print(result)
    
    # Lưu ra file CSV để lỡ có lỗi cũng không bị mất data sau mười mấy phút chạy
    try:
        df = result.to_pandas()
        df.to_csv("ragas_baseline_results.csv", index=False, encoding='utf-8-sig')
        print("\n[OK] Đã lưu chi tiết điểm số của từng câu hỏi vào file: ragas_baseline_results.csv")
    except Exception as e:
        print("Không thể lưu file CSV:", e)
        
    print("=" * 50)
    print("Tip: Hãy copy kết quả trên vào CV hoặc README của project!")

if __name__ == "__main__":
    # Lưu ý: Cần đảm bảo có GEMINI_API_KEY trong biến môi trường
    run_evaluation()
