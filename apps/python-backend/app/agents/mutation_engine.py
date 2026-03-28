import ast, copy, subprocess, json, os, time
from typing import List, Dict, Tuple
from pathlib import Path

# ── Mutator definitions ────────────────────────────────────────────────────

class CompareMutator(ast.NodeTransformer):
    """Flip comparison operators: > → >=, < → <=, == → !="""
    FLIPS = {ast.Gt: ast.GtE, ast.GtE: ast.Gt, ast.Lt: ast.LtE, ast.LtE: ast.Lt, ast.Eq: ast.NotEq, ast.NotEq: ast.Eq}
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
    FLIPS = {ast.Add: ast.Sub, ast.Sub: ast.Add, ast.Mult: ast.Div, ast.Div: ast.Mult}
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
    """Find all lines that can be mutated."""
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
        ast.fix_missing_locations(mutated_tree)
        import astor  # pip install astor
        return astor.to_source(mutated_tree), True
    except Exception:
        return source, False

def run_tests(test_command: str, cwd: str, timeout: int = 30) -> bool:
    """Run test suite, return True if all tests pass."""
    try:
        # Use shell=True for complex commands like 'npm test' or 'pytest'
        result = subprocess.run(
            test_command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            timeout=timeout,
        )
        return result.returncode == 0
    except Exception:
        return True  # timeout or crash = we can't tell, treat as survived

def run_mutation_testing(
    file_path: str,
    source: str,
    test_command: str,
    repo_path: str,
    max_mutations: int = 20,
) -> List[Dict]:
    """
    Run mutation testing on a file.
    Returns list of survived mutations (weak test spots).
    """
    mutable_lines = get_mutable_lines(source)
    if not mutable_lines:
        return []

    import tempfile, shutil
    survived = []
    tested = 0

    backup_path = file_path + '.aether_backup'

    for line in mutable_lines:
        if tested >= max_mutations:
            break
        for mutator_class in MUTATORS:
            if tested >= max_mutations:
                break
            mutated_source, applied = apply_mutation(source, line, mutator_class)
            if not applied:
                continue

            # Write mutated file to temp location
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as tmp:
                tmp.write(mutated_source)
                tmp_path = tmp.name

            try:
                # Replace original with mutant temporarily
                shutil.copy(file_path, backup_path)
                shutil.copy(tmp_path, file_path)

                tests_pass = run_tests(test_command, repo_path)
                tested += 1

                if tests_pass:
                    # Mutation survived — tests didn't catch it
                    desc = ""
                    if mutator_class == CompareMutator: desc = "comparison operator flipped"
                    elif mutator_class == NullGuardMutator: desc = "null guard removed"
                    elif mutator_class == ArithMutator: desc = "arithmetic operator flipped"
                    
                    survived.append({
                        "line": line,
                        "mutator": mutator_class.__name__.replace('Mutator', '').lower(),
                        "description": desc,
                    })
            except Exception: pass
            finally:
                # Always restore original
                if os.path.exists(backup_path):
                    shutil.copy(backup_path, file_path)
                    os.unlink(backup_path)
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

    return survived
