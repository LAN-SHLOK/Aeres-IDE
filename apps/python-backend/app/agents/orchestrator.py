"""Orchestrator — runs the full modernization pipeline."""

from __future__ import annotations

import json
import asyncio
from typing import AsyncGenerator

from app.agents.anomaly_detector import detect_language, traverse_and_flag
from app.rag_engine.groq_gateway import (
    assemble_strict_prompt,
    generate_modernize_rule,
)
from app.rag_engine.vector_db import query_relevant_fix, store_migration_context
from app.scrapers.doc_crawler import crawl_and_extract, filter_migration_syntax, resolve_doc_url
from app.scrapers.text_processor import chunk_for_vectorization

import ast
try:
    import astor
except ImportError:
    astor = None

def apply_ast_rule(content: str, old_sig: str, new_sig: str, language: str) -> str:
    """Mathematically swaps the old signature with the new signature using AST parsing."""
    if language == "python" and astor:
        try:
            tree = ast.parse(content)
            old_tree = ast.parse(old_sig)
            new_tree = ast.parse(new_sig)
            
            class RuleTransformer(ast.NodeTransformer):
                def __init__(self, target_ast, replacement_ast):
                    self.target_ast = target_ast
                    self.replacement_ast = replacement_ast
                    self.matched = False
                    
                def generic_visit(self, node):
                    # Naive exact AST match
                    if hasattr(self.target_ast, 'body') and len(self.target_ast.body) > 0:
                        if ast.dump(node) == ast.dump(self.target_ast.body[0]):
                            self.matched = True
                            return self.replacement_ast.body[0]
                    return super().generic_visit(node)
                    
            transformer = RuleTransformer(old_tree, new_tree)
            new_ast = transformer.visit(tree)
            
            if transformer.matched:
                return astor.to_source(new_ast)
        except Exception:
            pass
            
    # Fallback to precise exact string replacement for non-Python or failed AST parsing
    if old_sig and old_sig in content:
        return content.replace(old_sig, new_sig)
    return content


def get_folder_structure(file_path: str) -> str:
    """Climb up from file_path to find project root and build a depth=2 tree."""
    import os
    try:
        current = os.path.dirname(os.path.abspath(file_path))
        root = current
        for _ in range(5):
            if os.path.exists(os.path.join(current, "package.json")) or os.path.exists(os.path.join(current, ".git")):
                root = current
                break
            parent = os.path.dirname(current)
            if parent == current:
                break
            current = parent
        
        tree = []
        for dirpath, dirnames, filenames in os.walk(root):
            if 'node_modules' in dirnames: dirnames.remove('node_modules')
            if '.git' in dirnames: dirnames.remove('.git')
            if 'venv' in dirnames: dirnames.remove('venv')
            if '__pycache__' in dirnames: dirnames.remove('__pycache__')
            
            depth = dirpath.replace(root, '').count(os.sep)
            if depth > 2:
                del dirnames[:]
                continue
                
            indent = "  " * depth
            folder_name = os.path.basename(dirpath) or root
            tree.append(f"{indent}📁 {folder_name}/")
            
            subindent = "  " * (depth + 1)
            for f in filenames[:10]: # Limit to 10 files
                tree.append(f"{subindent}📄 {f}")
                
        return "\n".join(tree)
    except Exception:
        return ""


async def run_modernize_pipeline(
    file_content: str, file_path: str, api_key: str = None
) -> AsyncGenerator[str, None]:
    """Run the modernization pipeline using AST Rule Generation."""
    language = detect_language(file_path)
    flags = traverse_and_flag(file_content, language)

    if not flags:
        # Fallback to AI Analysis for anything not in the DB
        folder_structure = await asyncio.to_thread(get_folder_structure, file_path)
        prompt = f"Analyze this {language} file for ANY deprecated functions, legacy patterns, or framework-specific lint warnings (e.g., using <img> instead of next/image in Next.js, or old React patterns). If the file is already modern and optimal, output exactly the word 'NO_DEPRECATIONS'. Otherwise, output ONLY the fully modernized and fixed source code. Do NOT output markdown or explanations, just the raw code.\n\nFile:\n```\n{file_content}\n```"
        
        from app.rag_engine.groq_gateway import generate_modernize_rule
        new_file_content = await generate_modernize_rule(prompt, api_key=api_key)
        
        if not new_file_content or new_file_content.strip() == "NO_DEPRECATIONS":
            yield json.dumps({
                "type": "no_deprecations"
            })
            return
            
        yield json.dumps({
            "type": "flag_found",
            "flag": {"function_name": "AI Legacy Detection", "severity": "info", "code_snippet": "AI found sub-optimal code", "line_number": 0, "replacement": "AI Modernization", "docs_query": "", "since_version": ""},
            "source_url": "AI Detection",
        })
        
        yield json.dumps({"type": "code_chunk", "content": new_file_content})
        yield json.dumps({"type": "done"})
        return

    current_content = file_content
    folder_structure = await asyncio.to_thread(get_folder_structure, file_path)

    for flag in flags:
        try:
            # ONLY use offline VectorDB populated by the cron_scraper
            rag_results = await asyncio.to_thread(query_relevant_fix, flag.function_name)
            context = "\n\n".join(r["document"] for r in rag_results if r.get("document"))
            
            source_url = ""
            if rag_results and rag_results[0].get("source_url"):
                source_url = rag_results[0]["source_url"]

            # Prompt now asks for the entire modernized file
            prompt = assemble_strict_prompt(current_content, context, flag.function_name, folder_structure)

            yield json.dumps({
                "type": "flag_found",
                "flag": flag.model_dump(),
                "source_url": source_url,
            })

            # Get the fully modernized file from the LLM
            new_file_content = await generate_modernize_rule(prompt, api_key=api_key)
            
            if new_file_content:
                current_content = new_file_content

            yield json.dumps({"type": "code_chunk", "content": current_content})

        except Exception as e:
            yield json.dumps({
                "type": "flag_found",
                "flag": flag.model_dump(),
                "source_url": "",
            })
            yield json.dumps({
                "type": "code_chunk",
                "content": current_content,
            })

    yield json.dumps({"type": "done"})
