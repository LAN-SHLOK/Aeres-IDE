from __future__ import annotations

from typing import AsyncGenerator, List, Optional, Sequence, Union

from groq import AsyncGroq

from app.core.config import settings


import logging

async def stream_modernized_code(prompt: str) -> AsyncGenerator[str, None]:
    logging.info(f"[Groq] Starting stream completion...")
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    stream = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2048,
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



async def groq_complete(
    system: str,
    user: str,
    max_tokens: int = 500,
    temperature: float = 0.2,
    stop: Optional[Union[str, Sequence[str]]] = None,
    model: Optional[str] = None,
) -> str:
    selected_model = model or settings.GROQ_CHAT_MODEL
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
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
    max_tokens: int = 4000,
    temperature: float = 0.1,
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

    model = "llama-3.2-90b-vision-preview" if has_image else settings.GROQ_MODEL

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
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


def assemble_strict_prompt(ast_block: str, scraped_docs: str, flagged_function: str) -> str:
    return f"""You are a code modernization engine. You ONLY output raw code. No explanations. No markdown. No preamble.

DEPRECATED FUNCTION DETECTED: {flagged_function}

OFFICIAL MIGRATION DOCUMENTATION:
{scraped_docs}

USER'S CODE TO REWRITE:
{ast_block}

RULES:
1. Rewrite ONLY the deprecated pattern. Change nothing else.
2. Follow ONLY the patterns shown in the migration documentation above.
3. Output ONLY the rewritten code block. No commentary.
4. Preserve all variable names, imports, and surrounding logic.
5. If the documentation is unclear, output the original code unchanged.
"""


