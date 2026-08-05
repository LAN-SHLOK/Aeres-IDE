from __future__ import annotations

from typing import AsyncGenerator, List, Optional, Sequence, Union

from groq import AsyncGroq

from app.core.config import settings


import logging

async def generate_modernize_rule(prompt: str, api_key: str = None) -> str:
    logging.info(f"[Groq] Generating AST transformation rule...")
    client = AsyncGroq(api_key=api_key or settings.GROQ_API_KEY)
    resp = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=4096,
        temperature=0.1,
    )
    msg = resp.choices[0].message
    return (msg.content or "") if msg else ""

async def stream_modernized_code(prompt: str, api_key: str = None) -> AsyncGenerator[str, None]:
    logging.info(f"[Groq] Starting stream completion...")
    client = AsyncGroq(api_key=api_key or settings.GROQ_API_KEY)
    stream = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=8192,
        temperature=0.1,
        stream=True,
    )
    first_chunk = True
    buffer = ""
    async for chunk in stream:
        choice = chunk.choices[0]
        delta = choice.delta
        if delta and delta.content:
            content = delta.content
            if first_chunk:
                buffer += content
                if len(buffer) < 20:
                    if not any(buffer.startswith(x) for x in ("`", "``", "```")):
                        yield buffer
                        buffer = ""
                        first_chunk = False
                    continue
                else:
                    cleaned = buffer.strip()
                    if cleaned.startswith("```"):
                        nl_idx = cleaned.find("\n")
                        if nl_idx != -1:
                            cleaned = cleaned[nl_idx + 1:]
                        else:
                            cleaned = ""
                    yield cleaned
                    buffer = ""
                    first_chunk = False
            else:
                if "```" in content:
                    content = content.split("```")[0]
                    if content:
                        yield content
                    break
                yield content
    if buffer:
        yield buffer

async def stream_chat(system: str, user: str, max_tokens: int = 8192, api_key: str = None) -> AsyncGenerator[str, None]:
    client = AsyncGroq(api_key=api_key or settings.GROQ_API_KEY)
    stream = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=max_tokens,
        temperature=0.2,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content



async def groq_complete(
    system: str,
    user: str,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    stop: Optional[Union[str, Sequence[str]]] = None,
    model: Optional[str] = None,
    api_key: str = None,
    intelligence_level: str = "complex",
) -> str:
    if model is None:
        if intelligence_level == "fast":
            selected_model = getattr(settings, "GROQ_FAST_MODEL", settings.GROQ_MODEL)
        elif intelligence_level == "vision":
            selected_model = getattr(settings, "GROQ_VISION_MODEL", settings.GROQ_MODEL)
        else:
            selected_model = settings.GROQ_CHAT_MODEL
    else:
        selected_model = model
    client = AsyncGroq(api_key=api_key or settings.GROQ_API_KEY)
    kwargs = dict(
        model=selected_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    if stop is not None:
        kwargs["stop"] = stop
    resp = await client.chat.completions.create(**kwargs)
    msg = resp.choices[0].message
    return (msg.content or "") if msg else ""


async def groq_tool_complete(
    messages: list,
    tools: list = None,
    max_tokens: int = 4096,
    temperature: float = 0.1,
    api_key: str = None,
    intelligence_level: str = "complex",
):
    """Groq completion with tool-use (function-calling) support.
    Returns the raw response object so callers can access tool_calls.
    """
    # Auto-detect if any message contains an image_url
    has_image = False
    for msg in messages:
        content = msg.get("content")
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict) and item.get("type") == "image_url":
                    has_image = True
                    break
        if has_image:
            break

    if has_image:
        model = getattr(settings, "GROQ_VISION_MODEL", "llama-3.2-90b-vision-preview")
    elif intelligence_level == "fast":
        model = getattr(settings, "GROQ_FAST_MODEL", settings.GROQ_MODEL)
    else:
        model = settings.GROQ_MODEL

    client = AsyncGroq(api_key=api_key or settings.GROQ_API_KEY)
    kwargs = dict(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"
    
    return await client.chat.completions.create(**kwargs)


def enforce_syntax_only(raw: str) -> str:
    lines = raw.split("\n")
    cleaned: List[str] = []
    in_fence = False
    for line in lines:
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            low = line.lower().strip()
            if any(
                low.startswith(p)
                for p in (
                    "here is",
                    "here's",
                    "sure",
                    "of course",
                    "i'll",
                    "i will",
                    "let me",
                    "the fix",
                )
            ):
                continue
        cleaned.append(line)
    return "\n".join(cleaned).strip()


def assemble_strict_prompt(file_content: str, scraped_docs: str, flagged_function: str, folder_structure: str = "", dep_name: str = None) -> str:
    folder_context = f"\nWORKSPACE FOLDER STRUCTURE:\n```\n{folder_structure}\n```\n(Use this to ensure your imports and relative paths remain correct.)\n" if folder_structure else ""
    dep_instruction = f"\nCRITICAL INSTRUCTION: The user is specifically asking to remove the '{dep_name}' dependency from this file. You MUST completely rewrite the file to use modern native equivalents (e.g. native fetch API, axios, or native fs) instead of '{dep_name}'." if dep_name else ""
    return f"""You are an elite Principal Engineer and code modernization engine. Your job is to rewrite the provided file to remove the deprecated function and comprehensively modernize the entire file according to the official documentation and best practices.

DEPRECATED FUNCTION DETECTED: {flagged_function}
{folder_context}{dep_instruction}
OFFICIAL MIGRATION DOCUMENTATION (Read carefully):
{scraped_docs}

USER'S FULL FILE CONTENT:
```
{file_content}
```

RULES:
1. Locate and fix the deprecated function `{flagged_function}` in the user's code using the official migration documentation.
2. Beyond just fixing the deprecation, perform a comprehensive modernization of the entire file. Look for missing type hints, suboptimal async/await logic, legacy patterns, and performance anti-patterns.
3. Completely rewrite the user's code to be optimal and modern. Ensure all imports match the user's provided Folder Structure.
4. Output ONLY the raw, completely modernized source code. Do NOT output markdown, do NOT output explanations, do NOT wrap it in ```. Just the raw text of the file.
5. CRITICAL: You MUST output the ENTIRE file from the very first line to the very last line. Do NOT use comments like "// ... rest of the code". Do NOT truncate the file. If you truncate the file, the user's application will break.
"""


