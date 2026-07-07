#!/usr/bin/env python3
"""
Main entry point for the backend application.
This file serves as the primary entry point for running the FastAPI application.
"""

import os
from pathlib import Path

# Add the app directory to Python path
import sys
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    
    # Get configuration from environment variables or use defaults
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", "8000"))
    
    print(f"Starting backend server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)