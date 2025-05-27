import uvicorn
from .app import app

if __name__ == "__main__":
    config = uvicorn.Config(port=8000, log_level="info", host="0.0.0.0", app=app)
    server = uvicorn.Server(config)
    server.run()