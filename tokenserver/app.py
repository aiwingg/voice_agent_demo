from typing import Annotated, Union, Literal, Any

from fastapi import  FastAPI, Depends, Request
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse, FileResponse
from fastapi.exceptions import HTTPException
from fastapi.dependencies import models
from retell import AsyncRetell
from contextlib import asynccontextmanager
from pydantic import BaseModel
import traceback
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

class Response(BaseModel):
    provider: Union[Literal["retellai"], Literal["livekit"]]
    payload: dict[str, Any]


@asynccontextmanager
async def lifespan(app_inst: FastAPI):
    client = AsyncRetell(api_key="key_7335fefc4661ce2fd9f790780ad5")
    app_inst.state.retell = client
    yield
    await client.close()


dyn = {
    "user_number": "9280291870",
    "name": "Крокус ООО",
    "purchase_history": "- Филе ЦБ 15кг мон зам Благояр (339.2 руб / кг) [ЦБ-00001549]\n "
                        "- Филе ЦБ Халяль \"Для жарки\" мон зам Благояр (342.38 руб / кг) [01-00003115]\n - "
                        "Филе ЦБ Халяль мон зам Чагулов ИП (311.0 руб / кг) [01-00012701]\n - "
                        "1 сорт Тушка ЦБ пак зам Благояр (180.2 руб / кг) [00-00000028]\n - "
                        "1 сорт Тушка ЦБ 1,7 кг Халяль пак зам АН-НУР (192.92 руб / кг) [01-00003181]"
}

def get_retell(req: Request) -> AsyncRetell:
    return req.app.state.retell


RetellDep = Annotated[AsyncRetell, Depends(get_retell)]

app = FastAPI(name="Token Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": f"can't handle request: {request.url}",
            "traceback": traceback.format_exception(exc),
        },
    )


@app.post("/api/create-web-call", status_code=200)
async def create_web_call(retell: RetellDep) -> Response:
    try:
        web_call_resp = await retell.call.create_web_call(
            agent_id="agent_838c0e063de92ecdacfa548307",
            metadata={"demo": True},
            retell_llm_dynamic_variables=dyn)
        return Response(provider="retellai", payload=web_call_resp.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



app.mount("/client", StaticFiles(directory="tokenserver/static"), name="static")


@app.get("/{path:path}")
async def serve_spa(path: str):
    full_path = f"tokenserver/static/{path}"
    if os.path.exists(full_path) and path != "":
        return FileResponse(full_path)
    return FileResponse("tokenserver/static/index.html")
