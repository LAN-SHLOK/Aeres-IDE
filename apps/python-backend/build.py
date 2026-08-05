import PyInstaller.__main__
import os

print("Compiling backend...")

args = [
    'main.py',
    '--name=backend-x86_64-pc-windows-msvc',
    '--onefile',
    '--noconsole',
    '--clean',
    '--hidden-import=uvicorn.logging',
    '--hidden-import=uvicorn.loops',
    '--hidden-import=uvicorn.loops.auto',
    '--hidden-import=uvicorn.protocols',
    '--hidden-import=uvicorn.protocols.http',
    '--hidden-import=uvicorn.protocols.http.auto',
    '--hidden-import=uvicorn.protocols.websockets',
    '--hidden-import=uvicorn.protocols.websockets.auto',
    '--hidden-import=uvicorn.lifespan',
    '--hidden-import=uvicorn.lifespan.on',
    '--hidden-import=uvicorn.lifespan.off',
    '--hidden-import=pydantic.deprecated.decorator'
]

PyInstaller.__main__.run(args)
print("Done compiling.")
