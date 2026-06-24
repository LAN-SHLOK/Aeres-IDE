import ast
from typing import List, Dict

def parse_python_file(source_code: str, file_path: str) -> List[Dict]:
    """
    Parses a Python source file using the built-in ast module and extracts
    classes, functions, and module-level context to map the structural architecture.
    """
    nodes_info = []
    try:
        tree = ast.parse(source_code, filename=file_path)
    except SyntaxError:
        return nodes_info  # Return empty if invalid Python code

    source_lines = source_code.splitlines()

    def get_source_segment(node) -> str:
        if not hasattr(node, "lineno") or not hasattr(node, "end_lineno"):
            return ""
        start = node.lineno - 1
        end = node.end_lineno
        return "\n".join(source_lines[start:end])

    # Extract module docstring
    module_doc = ast.get_docstring(tree)
    if module_doc:
        nodes_info.append({
            "file_path": file_path,
            "type": "module",
            "name": file_path.split('/')[-1],
            "docstring": module_doc,
            "code": ""
        })

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            nodes_info.append({
                "file_path": file_path,
                "type": "class",
                "name": node.name,
                "docstring": ast.get_docstring(node) or "",
                "code": get_source_segment(node)
            })
        elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
            # To avoid saving deeply nested functions directly as main nodes, 
            # we can check if it's top level or part of a class. But ast.walk flattens it.
            # We'll just capture everything for semantic search.
            nodes_info.append({
                "file_path": file_path,
                "type": "function",
                "name": node.name,
                "docstring": ast.get_docstring(node) or "",
                "code": get_source_segment(node)
            })

    return nodes_info

import re

def extract_block(source_code: str, start_index: int) -> str:
    lines = source_code[start_index:].splitlines()
    block_lines = []
    brace_count = 0
    started = False
    
    for line in lines:
        block_lines.append(line)
        brace_count += line.count('{')
        brace_count -= line.count('}')
        
        if '{' in line:
            started = True
            
        if started and brace_count <= 0:
            break
            
        if len(block_lines) > 200:
            block_lines.append("... (truncated)")
            break
            
    return "\n".join(block_lines)

def parse_js_file(source_code: str, file_path: str) -> List[Dict]:
    """
    Simulates AST parsing for JS/TS files using Regex block extraction.
    """
    nodes_info = []
    
    # Classes
    for match in re.finditer(r'(?:export\s+)?(?:default\s+)?class\s+([A-Za-z0-9_]+)', source_code):
        nodes_info.append({
            "file_path": file_path,
            "type": "class",
            "name": match.group(1),
            "docstring": "",
            "code": extract_block(source_code, match.start())
        })
        
    # Functions
    for match in re.finditer(r'(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)', source_code):
        nodes_info.append({
            "file_path": file_path,
            "type": "function",
            "name": match.group(1),
            "docstring": "",
            "code": extract_block(source_code, match.start())
        })
        
    # Arrow Functions
    for match in re.finditer(r'(?:export\s+)?(?:default\s+)?(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>', source_code):
        nodes_info.append({
            "file_path": file_path,
            "type": "function",
            "name": match.group(1),
            "docstring": "",
            "code": extract_block(source_code, match.start())
        })
        
    # React Components (capitalized const)
    for match in re.finditer(r'(?:export\s+)?(?:default\s+)?(?:const|let|var)\s+([A-Z][A-Za-z0-9_]+)\s*=', source_code):
        # Only add if we didn't already catch it as an arrow function
        if not any(n["name"] == match.group(1) for n in nodes_info):
            nodes_info.append({
                "file_path": file_path,
                "type": "component",
                "name": match.group(1),
                "docstring": "",
                "code": extract_block(source_code, match.start())
            })
            
    return nodes_info

def parse_generic_file(source_code: str, file_path: str) -> List[Dict]:
    """
    Chunks generic files (like css, html, yaml, etc.) into small blocks so they can be queried.
    """
    nodes_info = []
    lines = source_code.splitlines()
    chunk_size = 50
    for i in range(0, len(lines), chunk_size):
        chunk = "\n".join(lines[i:i+chunk_size])
        nodes_info.append({
            "file_path": file_path,
            "type": "chunk",
            "name": f"chunk_{i//chunk_size + 1}",
            "docstring": "",
            "code": chunk
        })
    return nodes_info
