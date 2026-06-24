from fastapi import APIRouter, Request, Response
import httpx

router = APIRouter()

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def proxy_request(path: str, request: Request):
    target_url = request.headers.get("x-proxy-target")
    if not target_url:
        return Response(content="Missing x-proxy-target header", status_code=400)
    
    # Forward the request
    async with httpx.AsyncClient() as client:
        body = await request.body()
        headers = dict(request.headers)
        # Strip problematic hop-by-hop headers and encodings
        for h in ["host", "content-length", "x-proxy-target"]:
            headers.pop(h, None)
            
        try:
            res = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
                follow_redirects=True,
                timeout=30.0
            )
            headers_to_return = dict(res.headers)
            headers_to_return.pop("content-encoding", None)
            headers_to_return.pop("content-length", None)
            headers_to_return.pop("transfer-encoding", None)
            return Response(
                content=res.content,
                status_code=res.status_code,
                headers=headers_to_return
            )
        except Exception as e:
            return Response(content=str(e), status_code=500)
