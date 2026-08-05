from fastapi import APIRouter, Request, Response
import httpx

router = APIRouter()

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def proxy_request(path: str, request: Request):
    target_url = request.headers.get("x-proxy-target") or request.query_params.get("target")
    if not target_url:
        return Response(content="Missing x-proxy-target header or target query param", status_code=400)
    
    # Forward the request
    async with httpx.AsyncClient() as client:
        body = await request.body()
        headers = dict(request.headers)
        # Strip problematic hop-by-hop headers and encodings
        for h in ["host", "content-length", "x-proxy-target", "accept-encoding"]:
            headers.pop(h, None)
            
        try:
            kwargs = {
                "method": request.method,
                "url": target_url,
                "headers": headers,
                "follow_redirects": True,
                "timeout": 30.0
            }
            if request.method not in ("GET", "HEAD", "OPTIONS"):
                kwargs["content"] = body
                
            res = await client.request(**kwargs)
            headers_to_return = dict(res.headers)
            headers_to_return.pop("content-encoding", None)
            headers_to_return.pop("content-length", None)
            headers_to_return.pop("transfer-encoding", None)
            headers_to_return.pop("x-frame-options", None)
            headers_to_return.pop("content-security-policy", None)
            
            content = res.content
            # Inject <base> tag to fix relative assets (CSS, JS, images)
            content_type = headers_to_return.get("content-type", "")
            if "text/html" in content_type:
                from urllib.parse import urlparse
                parsed = urlparse(target_url)
                # We use the exact target url or its root as the base
                base_url = f"{parsed.scheme}://{parsed.netloc}/"
                
                try:
                    html_str = content.decode("utf-8")
                    base_tag = f'<base href="{base_url}">'
                    
                    import re
                    if "<head" in html_str.lower():
                        html_str = re.sub(r'(<head[^>]*>)', r'\1\n' + base_tag, html_str, count=1, flags=re.IGNORECASE)
                    else:
                        html_str = base_tag + html_str
                        
                    content = html_str.encode("utf-8")
                except:
                    pass
            
            return Response(
                content=content,
                status_code=res.status_code,
                headers=headers_to_return
            )
        except Exception as e:
            return Response(content=str(e), status_code=500)
