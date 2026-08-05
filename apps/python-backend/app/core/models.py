from __future__ import annotations

from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class Language(str, Enum):
    javascript = "javascript"
    typescript = "typescript"
    python = "python"
    go = "go"
    rust = "rust"
    java = "java"
    kotlin = "kotlin"
    csharp = "csharp"
    cpp = "cpp"
    c = "c"
    ruby = "ruby"
    php = "php"
    dart = "dart"
    swift = "swift"
    lua = "lua"
    elixir = "elixir"
    haskell = "haskell"
    scala = "scala"
    r = "r"
    perl = "perl"
    shell = "shell"
    powershell = "powershell"
    nim = "nim"
    zig = "zig"
    fsharp = "fsharp"
    clojure = "clojure"
    erlang = "erlang"
    sql = "sql"
    graphql = "graphql"
    yaml = "yaml"
    toml = "toml"
    xml = "xml"
    markdown = "markdown"
    html = "html"
    css = "css"
    scss = "scss"
    json = "json"
    protobuf = "protobuf"
    hcl = "hcl"
    verilog = "verilog"
    vhdl = "vhdl"
    asm = "asm"
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
    dep_name: Optional[str] = None


class ProjectScanRequest(BaseModel):
    file_paths: List[str] = Field(..., max_length=500)


class HealthScanRequest(BaseModel):
    root_path: str


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



class CausalChainRequest(BaseModel):
    repo_path: str
    file_path: str
    function_name: str
    error_message: str = ""


class AgentStreamRequest(BaseModel):
    instruction: str
    context: str = ""
    file_path: str = ""
    root_path: str = ""
    conversation: List[dict] = []
    images: List[str] = []

