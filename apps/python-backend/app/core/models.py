from __future__ import annotations

from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class Language(str, Enum):
    javascript = "javascript"
    typescript = "typescript"
    python = "python"
    unknown = "unknown"


class Severity(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class DeprecationFlag(BaseModel):
    line_number: int
    function_name: str
    replacement: str
    docs_query: str
    code_snippet: str
    severity: Severity
    since_version: str = ""


class ModernizeRequest(BaseModel):
    content: str = Field(..., max_length=500_000)
    path: str


class ProjectScanRequest(BaseModel):
    file_paths: List[str] = Field(..., max_length=500)


class RagQueryRequest(BaseModel):
    question: str
    context: str = ""
    root_path: Optional[str] = None


class ComplexityRequest(BaseModel):
    content: str
    language: str


class CompletionRequest(BaseModel):
    prefix: str
    suffix: str
    language: str
    file_path: str


class ExplainRequest(BaseModel):
    selection: str
    language: str


class GenerateRequest(BaseModel):
    comment: str
    context: str
    language: str


class TimingIngestRequest(BaseModel):
    file_path: str
    timings: List[dict]


class ObservationRequest(BaseModel):
    file_path: str
    function_name: str
    inputs: List[Any] = Field(default_factory=list)
    output: Any = None
    error: Optional[str] = None


class GenerateTestsRequest(BaseModel):
    file_path: str
    function_name: str
    language: str


class DepScanRequest(BaseModel):
    root_path: str


class MutationRunRequest(BaseModel):
    file_path: str
    source: str
    test_command: str
    repo_path: str
    max_mutations: int = 20


class CausalChainRequest(BaseModel):
    repo_path: str
    file_path: str
    function_name: str
    error_message: str = ""
