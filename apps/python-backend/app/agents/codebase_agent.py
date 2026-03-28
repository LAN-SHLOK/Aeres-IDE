import os
from typing import List, Dict
from app.rag_engine.groq_gateway import groq_complete
from app.rag_engine.vector_db import query_relevant_fix

class CodebaseAgent:
    def __init__(self, root_path: str):
        self.root_path = root_path

    async def answer_question(self, question: str, file_context: str = "") -> str:
        # 1. Search RAG for related documentation/past fixes
        rag_results = query_relevant_fix(question, n_results=3)
        context = "\n\n".join([r["document"] for r in rag_results])
        
        # 2. Add local file context if provided
        full_context = f"Global Documentation/Context:\n{context}\n\nLocal File Context:\n{file_context}"
        
        system_prompt = (
            "You are Aether IDE's lead architect. You help developers understand and modify their codebase. "
            "Use the provided context to answer questions accurately. If you don't know, say so. "
            "Be technical, concise, and proactive."
        )
        
        user_prompt = f"Context:\n{full_context}\n\nQuestion: {question}"
        
        answer = await groq_complete(system_prompt, user_prompt, max_tokens=1000)
        return answer

    def search_code(self, query: str) -> List[Dict]:
        """Simple grep-like search (fallback if rg is missing)."""
        results = []
        for root, _, files in os.walk(self.root_path):
            if any(x in root for x in [".git", "node_modules", "venv", "__pycache__"]):
                continue
            for file in files:
                if any(file.endswith(ext) for ext in [".js", ".jsx", ".ts", ".tsx", ".py", ".html", ".css"]):
                    path = os.path.join(root, file)
                    try:
                        with open(path, "r", encoding="utf-8", errors="replace") as f:
                            for i, line in enumerate(f):
                                if query.lower() in line.lower():
                                    results.append({
                                        "file": os.path.relpath(path, self.root_path),
                                        "line": i + 1,
                                        "content": line.strip()
                                    })
                                    if len(results) > 100: return results
                    except: continue
        return results
