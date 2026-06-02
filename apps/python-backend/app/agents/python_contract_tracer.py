import sys, json, os, functools, inspect, requests

BACKEND_URL = os.environ.get("AERES_BACKEND_URL", "http://127.0.0.1:8008")
FILE_PATH = os.environ.get("AERES_FILE_PATH", "")

def trace_calls(frame, event, arg):
    if event != 'call':
        return
    
    code = frame.f_code
    func_name = code.co_name
    
    # Only trace functions in the target file - use normalized comparison for Windows
    target_norm = os.path.normpath(FILE_PATH).lower().replace('\\', '/')
    current_norm = os.path.normpath(frame.f_code.co_filename).lower().replace('\\', '/')
    
    if current_norm != target_norm:
        return
        
    # Capture arguments
    arg_names = code.co_varnames[:code.co_argcount]
    args = [frame.f_locals.get(name) for name in arg_names]
    
    def trace_return(frame, event, arg):
        if event == 'return':
            try:
                # Use normalized target path for the API call
                target_norm = os.path.normpath(FILE_PATH).lower().replace('\\', '/')
                requests.post(f"{BACKEND_URL}/api/contracts/observe", json={
                    "file_path": target_norm,
                    "function_name": func_name,
                    "inputs": args,
                    "output": arg,
                    "error": None
                }, timeout=0.1)
            except Exception as e:
                print(f"[Contract Tracer] Error sending observation: {e}", file=sys.stderr)
        return trace_return
        
    return trace_return

def start_tracing(file_path):
    global FILE_PATH
    FILE_PATH = file_path
    sys.settrace(trace_calls)

if __name__ == "__main__":
    target = sys.argv[1]
    start_tracing(os.path.abspath(target))
    with open(target, 'rb') as f:
        code = compile(f.read(), target, 'exec')
        exec(code, {'__name__': '__main__', '__file__': target})
