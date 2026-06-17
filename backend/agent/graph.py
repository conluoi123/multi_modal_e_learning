from langgraph.graph import StateGraph, END
from backend.agent.state import AgentState 
from backend.agent.nodes import router_node, rag_node, generate_quiz_node, evaluate_quiz_node

workflow = StateGraph(AgentState)

# 1. Khai báo các Node
workflow.add_node("router", router_node)
workflow.add_node("rag", rag_node)
workflow.add_node("generate_quiz", generate_quiz_node)
workflow.add_node("evaluate_quiz", evaluate_quiz_node)

workflow.set_entry_point("router")

# 2. Logic định tuyến từ Router
def route_decision(state): 
    if state["intent"] == "quiz": 
        return "generate_quiz"
    return "rag"

workflow.add_conditional_edges(
    "router", 
    route_decision, 
    {
        "generate_quiz": "generate_quiz", 
        "rag": "rag"
    }
)

# 3. Nối từ Generate sang Evaluate
workflow.add_edge("generate_quiz", "evaluate_quiz")

# 4. Logic vòng lặp Self-Correction (Từ Evaluate đi đâu?)
def eval_decision(state):
    score = state.get("quiz_score", 0)
    attempts = state.get("quiz_attempts", 1)
    
    # Nếu điểm thấp và chưa thử quá 3 lần -> Bắt làm lại
    if score < 15 and attempts < 3:
        print("[AGENT] Điểm quá thấp, quyết định: SINH LẠI BÀI TẬP!")
        return "generate_quiz"
    
    # Nếu điểm cao hoặc đã thử 3 lần -> Chấp nhận kết quả và Dừng
    return "end"

workflow.add_conditional_edges(
    "evaluate_quiz",
    eval_decision,
    {
        "generate_quiz": "generate_quiz",
        "end": END
    }
)

# RAG thì cứ chạy xong là Dừng
workflow.add_edge("rag", END)

app = workflow.compile()
