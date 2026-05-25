import ast
import copy
import subprocess
import json
import os
import time
import re
from typing import List, Dict, Tuple
from pathlib import Path

# ── Mutator definitions ────────────────────────────────────────────────────

class CompareMutator(ast.NodeTransformer):
    """Flip comparison operators: > → >=, < → <=, == → !="""
    FLIPS = {
        ast.Gt: ast.GtE,
        ast.GtE: ast.Gt,
        ast.Lt: ast.LtE,
        ast.LtE: ast.Lt,
        ast.Eq: ast.NotEq,
        ast.NotEq: ast.Eq
    }
    def __init__(self, target_lineno):
        self.target = target_lineno
        self.mutated = False
    def visit_Compare(self, node):
        if node.lineno == self.target and not self.mutated:
            new_ops = []
            for op in node.ops:
                flip = self.FLIPS.get(type(op))
                if flip and not self.mutated:
                    new_ops.append(flip())
                    self.mutated = True
                else:
                    new_ops.append(op)
            node.ops = new_ops
        return self.generic_visit(node)

class NullGuardMutator(ast.NodeTransformer):
    """Remove 'if x is None: return' guards"""
    def __init__(self, target_lineno):
        self.target = target_lineno
        self.mutated = False
    def visit_If(self, node):
        if node.lineno == self.target and not self.mutated:
            if isinstance(node.test, ast.Compare):
                for comp in node.test.comparators:
                    if isinstance(comp, ast.Constant) and comp.value is None:
                        self.mutated = True
                        return ast.Pass()
        return self.generic_visit(node)

class ArithMutator(ast.NodeTransformer):
    """Flip + to -, * to /"""
    FLIPS = {
        ast.Add: ast.Sub,
        ast.Sub: ast.Add,
        ast.Mult: ast.Div,
        ast.Div: ast.Mult
    }
    def __init__(self, target_lineno):
        self.target = target_lineno
        self.mutated = False
    def visit_BinOp(self, node):
        if node.lineno == self.target and not self.mutated:
            flip = self.FLIPS.get(type(node.op))
            if flip:
                node.op = flip()
                self.mutated = True
        return self.generic_visit(node)

MUTATORS = [CompareMutator, NullGuardMutator, ArithMutator]

def get_mutable_lines(source: str) -> List[int]:
    """Find all lines that can be mutated in Python code."""
    try:
        tree = ast.parse(source)
        lines = set()
        for node in ast.walk(tree):
            if isinstance(node, (ast.Compare, ast.If, ast.BinOp)) and hasattr(node, 'lineno'):
                lines.add(node.lineno)
        return sorted(lines)
    except Exception:
        return []

def apply_mutation(source: str, line: int, mutator_class) -> Tuple[str, bool]:
    """Apply one mutation and return modified source + whether mutation applied."""
    try:
        tree = ast.parse(source)
        mutator = mutator_class(line)
        mutated_tree = mutator.visit(copy.deepcopy(tree))
        if not mutator.mutated:
            return source, False
        try:
            import astor
            return astor.to_source(mutated_tree), True
        except ImportError:
            import ast
            if hasattr(ast, 'unparse'):
                return ast.unparse(mutated_tree), True
            raise
    except Exception:
        return source, False


def get_mutable_lines_regex(source: str) -> List[int]:
    """Find all lines that can be mutated in non-Python source files safely and accurately."""
    lines = source.splitlines()
    mutable = []
    for idx, line in enumerate(lines):
        lineno = idx + 1
        trimmed = line.strip()
        
        # Skip empty lines, comment lines, and standard boilerplate imports/exports
        if not trimmed:
            continue
        if trimmed.startswith(("//", "/*", "*", "#", "import ", "from ", "export ", "package ", "require(")):
            continue
            
        # Strip out trailing inline comments
        line_no_comments = line
        if "//" in line_no_comments:
            line_no_comments = line_no_comments.split("//")[0]
            
        # Strip out string literals to prevent mutating contents inside strings
        line_clean = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', '""', line_no_comments)
        line_clean = re.sub(r"'[^'\\]*(?:\\.[^'\\]*)*'", "''", line_clean)
        line_clean = re.sub(r"`[^`\\]*(?:\\.[^`\\]*)*`", "``", line_clean)
        
        # Strip out HTML/JSX tags to avoid breaking tag markers (<div ..., />)
        line_clean = re.sub(r'<[^>]+>', '', line_clean)
        
        # Check for comparison operators
        if re.search(r'(===|!==|==|!=|>=|<=)', line_clean):
            mutable.append(lineno)
            continue
            
        # Check for lone > or < (excluding arrows => or ->)
        if re.search(r'(?<![=-])[<>](?![=-])', line_clean):
            mutable.append(lineno)
            continue
            
        # Check for arithmetic operators surrounded by spaces (prevents path/import/negative sign issues)
        if re.search(r'\s+[-+*/]\s+', line_clean):
            mutable.append(lineno)
            continue
            
    return mutable


def apply_regex_mutation(source: str, lineno: int) -> Tuple[str, bool, str]:
    """Apply comparison or arithmetic operator flip on a line safely, preserving strings, comments, and JSX."""
    lines = source.splitlines()
    if lineno < 1 or lineno > len(lines):
        return source, False, ""
    
    line_content = lines[lineno - 1]
    trimmed = line_content.strip()
    if not trimmed or trimmed.startswith(("//", "/*", "*", "#", "import ", "from ", "export ", "package ")):
        return source, False, ""

    active_part = line_content
    comment_part = ""
    if "//" in line_content:
        parts = line_content.split("//", 1)
        active_part = parts[0]
        comment_part = "//" + parts[1]

    # Scan the active line character-by-character to mutate only outside tags, strings, and comments
    in_s_quote = False
    in_d_quote = False
    in_b_quote = False
    in_tag = 0
    
    comp_replacements = [
        ('===', '!=='), ('!==', '==='),
        ('==', '!='), ('!=', '=='),
        ('>=', '<'), ('<=', '>'),
        ('>', '<='), ('<', '>=')
    ]
    
    arith_replacements = [
        ('+', '-'), ('-', '+'),
        ('*', '/'), ('/', '*')
    ]

    i = 0
    n = len(active_part)
    while i < n:
        char = active_part[i]
        
        # Track string context
        if char == "'" and not in_d_quote and not in_b_quote:
            in_s_quote = not in_s_quote
            i += 1
            continue
        if char == '"' and not in_s_quote and not in_b_quote:
            in_d_quote = not in_d_quote
            i += 1
            continue
        if char == '`' and not in_s_quote and not in_d_quote:
            in_b_quote = not in_b_quote
            i += 1
            continue
            
        if in_s_quote or in_d_quote or in_b_quote:
            i += 1
            continue
            
        # Track HTML/JSX brackets safely
        if char == '<' and not in_tag:
            if i + 1 < n and active_part[i + 1] not in (' ', '=', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'):
                in_tag += 1
                i += 1
                continue
        elif char == '>' and in_tag > 0:
            in_tag -= 1
            i += 1
            continue
            
        if in_tag > 0:
            i += 1
            continue

        # Check for comparison replacements first
        for op, repl in comp_replacements:
            op_len = len(op)
            if i + op_len <= n and active_part[i:i+op_len] == op:
                # Avoid arrow functions or Go channels
                if op == '>' and i > 0 and active_part[i-1] in ('=', '-'):
                    continue
                if op == '<' and i + 1 < n and active_part[i+1] == '-':
                    continue
                
                mutated_active = active_part[:i] + repl + active_part[i+op_len:]
                lines[lineno - 1] = mutated_active + comment_part
                return "\n".join(lines), True, f"comparison operator '{op}' flipped to '{repl}'"

        # Check for arithmetic replacements surrounded by spaces
        for op, repl in arith_replacements:
            op_len = len(op)
            if i + op_len <= n and active_part[i:i+op_len] == op:
                if i > 0 and i + op_len < n and active_part[i-1] == ' ' and active_part[i+op_len] == ' ':
                    mutated_active = active_part[:i] + repl + active_part[i+op_len:]
                    lines[lineno - 1] = mutated_active + comment_part
                    return "\n".join(lines), True, f"arithmetic operator '{op}' flipped to '{repl}'"

        i += 1

    return source, False, ""


def run_tests(test_command: str, cwd: str, timeout: int = 30) -> bool:
    """Run test suite, return True if all tests pass."""
    try:
        result = subprocess.run(
            test_command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            timeout=timeout,
        )
        return result.returncode == 0
    except Exception:
        return True  # Treat crashes or timeouts as survived mutation


def run_mutation_testing(
    file_path: str,
    source: str,
    test_command: str,
    repo_path: str,
    max_mutations: int = 20,
) -> List[Dict]:
    """
    Run mutation testing on a file or recursively scan an entire directory.
    Returns list of survived mutations (weak test spots).
    """
    # ── Folder/Directory Scan mode ──────────────────────────────────────────
    if os.path.isdir(file_path):
        target_files = []
        supported_exts = {
            '.py', '.js', '.jsx', '.ts', '.tsx', '.go', '.rs', 
            '.java', '.kt', '.c', '.cpp', '.h', '.hpp', '.rb', '.php', '.cs'
        }
        for root, dirs, files in os.walk(file_path):
            # Prune directories to skip dependencies and packaging outputs
            dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', '.venv', 'venv', 'dist', 'build', '__pycache__')]
            for f in files:
                ext = Path(f).suffix.lower()
                if ext in supported_exts:
                    target_files.append(os.path.join(root, f))
                    
        if not target_files:
            return []
            
        all_survived = []
        # Distribute maximum mutations count evenly across discovered files
        mutations_per_file = max(1, max_mutations // len(target_files))
        
        for tf in target_files:
            try:
                with open(tf, 'r', encoding='utf-8') as f:
                    source_content = f.read()
                file_survived = run_mutation_testing(
                    file_path=tf,
                    source=source_content,
                    test_command=test_command,
                    repo_path=repo_path,
                    max_mutations=mutations_per_file
                )
                # Decorate survived mutations with relative file paths
                for s in file_survived:
                    rel_path = os.path.relpath(tf, file_path)
                    s["description"] = f"[{rel_path}] L{s['line']}: {s['description']}"
                    s["file_path"] = tf
                    all_survived.append(s)
            except Exception:
                pass
                
        return all_survived

    # ── Single File Scan mode ───────────────────────────────────────────────
    mutable_lines = get_mutable_lines(source)
    is_python = True
    if not mutable_lines:
        mutable_lines = get_mutable_lines_regex(source)
        is_python = False

    if not mutable_lines:
        return []

    import tempfile
    import shutil
    survived = []
    tested = 0

    backup_path = file_path + '.aeres_backup'

    for line in mutable_lines:
        if tested >= max_mutations:
            break
        
        if is_python:
            mutators = [(m, None) for m in MUTATORS]
        else:
            mutators = [(None, 'regex')]

        for mutator_class, mode in mutators:
            if tested >= max_mutations:
                break
                
            if is_python:
                mutated_source, applied = apply_mutation(source, line, mutator_class)
                desc = ""
                if mutator_class == CompareMutator: desc = "comparison operator flipped"
                elif mutator_class == NullGuardMutator: desc = "null guard removed"
                elif mutator_class == ArithMutator: desc = "arithmetic operator flipped"
                mutator_name = mutator_class.__name__.replace('Mutator', '').lower()
            else:
                mutated_source, applied, desc = apply_regex_mutation(source, line)
                mutator_name = "regex_operator"

            if not applied:
                continue

            suffix = Path(file_path).suffix or '.py'
            with tempfile.NamedTemporaryFile(mode='w', suffix=suffix, delete=False, encoding='utf-8') as tmp:
                tmp.write(mutated_source)
                tmp_path = tmp.name

            try:
                # Safe backup-and-swap sequence
                shutil.copy(file_path, backup_path)
                shutil.copy(tmp_path, file_path)

                tests_pass = run_tests(test_command, repo_path)
                tested += 1

                if tests_pass:
                    # Survival detected: tests still passed, proving weakness
                    survived.append({
                        "line": line,
                        "mutator": mutator_name,
                        "description": desc,
                    })
            except Exception:
                pass
            finally:
                # Critical restoration step to prevent workspace corruption
                if os.path.exists(backup_path):
                    shutil.copy(backup_path, file_path)
                    os.unlink(backup_path)
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

    return survived
