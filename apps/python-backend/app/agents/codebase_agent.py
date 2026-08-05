import os
import json
from typing import List, Dict
from app.core.config import settings
from app.rag_engine.groq_gateway import groq_complete
from app.rag_engine.vector_db import query_relevant_fix

class CodebaseAgent:
    def __init__(self, root_path: str, api_key: str = None):
        self.root_path = root_path
        self.api_key = api_key

    async def answer_question(self, question: str, file_context: str = "") -> str:
        # Fast-path: Skip CPU-heavy RAG embedding generation for simple greetings or very short queries
        clean_q = question.strip().lower().rstrip("?.! ")
        greetings = {
            "hi", "hello", "hey", "yo", "sup", "greetings", "howdy", "hola",
            "how are you", "how's it going", "how are you doing",
            "who are you", "what is this", "what are you", "what can you do", "help",
            "test"
        }
        
        if clean_q in greetings or len(clean_q) < 8:
            context = ""
        else:
            try:
                rag_results = query_relevant_fix(question, n_results=3)
                context = "\n\n".join([r["document"] for r in rag_results])
            except Exception as e:
                print(f"[CodebaseAgent] RAG query failed, bypassing: {e}")
                context = ""
        
        full_context = f"Global Documentation/Context:\n{context}\n\nLocal File Context:\n{file_context}"
        
        system_prompt = (
            "You are Aeres IDE's lead architect. You help developers understand and modify their codebase. "
            "Use the provided context to answer questions accurately. If you don't know, say so. "
            "Be technical, concise, and proactive."
        )
        
        user_prompt = f"Context:\n{full_context}\n\nQuestion: {question}"
        
        try:
            answer = await groq_complete(system_prompt, user_prompt, max_tokens=4096, api_key=self.api_key)
            return answer
        except Exception as e:
            print(f"[CodebaseAgent] Groq error: {e}")
            return f"I'm sorry, I encountered an error while processing your request: {str(e)}. Please check your GROQ_API_KEY."

    async def agent_edit(self, instruction: str, file_path: str, file_content: str) -> dict:
        """
        Agentic edit mode: Given an instruction and file content, return the full modified file.
        Returns { "action": "edit", "file_path": "...", "new_content": "...", "explanation": "..." }
        """
        system_prompt = (
            "You are Aeres IDE's coding agent. You receive a file and an instruction. "
            "You MUST return a JSON object with exactly these keys:\n"
            '- "action": always "edit"\n'
            '- "file_path": the file path provided\n'
            '- "new_content": the COMPLETE modified file content with the requested changes applied\n'
            '- "explanation": a brief 1-2 sentence summary of what you changed\n\n'
            "RULES:\n"
            "1. Return ONLY valid JSON. No markdown, no code fences, no extra text.\n"
            "2. The new_content must be the ENTIRE file with changes applied, not just a diff.\n"
            "3. Preserve all existing code that is not related to the instruction.\n"
            "4. If you cannot make the change, set action to 'none' and explain why."
        )
        
        user_prompt = (
            f"FILE PATH: {file_path}\n\n"
            f"CURRENT FILE CONTENT:\n```\n{file_content}\n```\n\n"
            f"INSTRUCTION: {instruction}"
        )
        
        try:
            raw = await groq_complete(system_prompt, user_prompt, max_tokens=8192, temperature=0.1, model="llama-3.3-70b-versatile", api_key=self.api_key)
            
            # Try to parse JSON from the response
            cleaned = raw.strip()
            import re
            json_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if json_match:
                cleaned = json_match.group(0)
            else:
                raise json.JSONDecodeError("No JSON block found", cleaned, 0)
                
            result = json.loads(cleaned)
            result["file_path"] = file_path  # ensure correct path
            return result
        except json.JSONDecodeError:
            # Fallback: return the raw response as explanation
            return {
                "action": "none",
                "file_path": file_path,
                "new_content": file_content,
                "explanation": f"Could not parse agent response. Raw output:\n{raw[:500]}"
            }
        except Exception as e:
            print(f"[CodebaseAgent] Agent edit error: {e}")
            return {
                "action": "error",
                "file_path": file_path,
                "new_content": file_content,
                "explanation": str(e)
            }

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
