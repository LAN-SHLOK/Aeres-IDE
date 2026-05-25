import re
lines = [
    "fastapi>=0.111,<0.120",
    "uvicorn[standard]>=0.30,<0.35",
    "pydantic>=2.10,<3"
]
for line in lines:
    match = re.match(r'^([a-zA-Z0-9_\-\.\[\]]+)\s*(?:[>=<~]{1,2})\s*([0-9\.\*a-z\-]+)', line)
    if match:
        print(f"Match: {match.group(1)} | {match.group(2)}")
    else:
        print(f"No match: {line}")
