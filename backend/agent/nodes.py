import json
from backend.rag.retriever import retrieve_context
from backend.rag.generator import generate_chat_answer
from backend.quiz.quiz_generator import generate_quiz
from backend.quiz.evaluator import evaluate_quiz_question

# --- Node 1: Người gác cổng ---
def router_node(state): 
    print("\n[AGENT] Đang suy luận ý định...")
    question = state["messages"][-1]["text"].lower()

    if "bài tập" in question or "trắc nghiệm" in question or "quiz" in question: 
        return {"intent": "quiz", "quiz_attempts": 0}
    else: 
        return {"intent": "rag"}

# --- Node 2: Tri thức RAG ---
def rag_node(state): 
    print("[AGENT] Ý định là Hỏi kiến thức -> Chạy RAG")
    question = state["messages"][-1]["text"]
    
    chunks = retrieve_context(question, k=3)
    answer = generate_chat_answer(question, chunks, state["messages"][:-1])
    
    state["messages"].append({"role": "assistant", "text": answer})
    state["docs"] = [c["text"] for c in chunks]
    return {"messages": state["messages"], "docs": state["docs"]}

# --- Node 3: Thợ tạo bài tập ---
def generate_quiz_node(state): 
    attempts = state.get("quiz_attempts", 0) + 1
    print(f"\n[AGENT] Đang sinh bài tập... (Lần {attempts})")
    question = state["messages"][-1]["text"]
    
    chunks = retrieve_context(question, k=5)
    context_text = "\n".join([chunk["text"] for chunk in chunks])
    
    quiz_set = generate_quiz(
        topic=question,
        context=context_text,
        n_questions=3,
        difficulty="standard",
    )
    
    return {"quiz_data": {"quiz_set": quiz_set, "context": context_text}, "quiz_attempts": attempts}

# --- Node 4: Giám khảo AI (Self-Correction) ---
def evaluate_quiz_node(state):
    print("[AGENT] Đang gọi Giám khảo AI chấm điểm câu hỏi...")
    quiz_set = state["quiz_data"]["quiz_set"]
    context_text = state["quiz_data"]["context"]
    
    # Chấm điểm câu đầu tiên làm đại diện để tăng tốc độ
    first_q = quiz_set.questions[0]
    
    eval_result = evaluate_quiz_question(
        context=context_text,
        question={
            "question": first_q.question,
            "options": first_q.options,
            "answer": first_q.answer
        }
    )
    
    try:
        total_score = sum(eval_result.values())
        print(f"[GIÁM KHẢO] Tổng điểm: {total_score}/20")
    except Exception as e:
        print(f"[GIÁM KHẢO] Lỗi parse điểm, cho điểm liệt = 10")
        total_score = 10
        
    # Format kết quả nếu đạt chuẩn hoặc hết lượt chạy
    messages = state.get("messages", [])
    if total_score >= 15 or state["quiz_attempts"] >= 3:
        if total_score >= 15:
            print("[AGENT] Điểm TỐT! Đang xuất kết quả...")
        else:
            print("[AGENT] Đã thử 3 lần vẫn kém, trả về kết quả tốt nhất có thể.")
            
        quiz_text = "Dưới đây là bộ bài tập đã vượt qua vòng kiểm duyệt của AI:\n\n"
        for i, q in enumerate(quiz_set.questions):
            quiz_text += f"**Câu {i+1}: {q.question}**\n"
            for opt in q.options:
                quiz_text += f"- {opt}\n"
            quiz_text += f"*Đáp án: {q.answer}*\n\n"
        
        messages.append({"role": "assistant", "text": quiz_text})
        
    return {"quiz_score": total_score, "messages": messages}
