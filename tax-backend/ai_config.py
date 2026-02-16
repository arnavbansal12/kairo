
# ai_config.py
# -----------------------------------------------------------------------------
# MULTI-MODEL AI ARCHITECTURE - OpenRouter Configuration
# Routes requests to specialized models for optimal performance
# Updated to use Multi-Key Rotation Client (Async)
# -----------------------------------------------------------------------------

import json
import base64
import asyncio
from typing import Optional, Dict, Any, List
# Import the singleton client from our new module
from openrouter_client import client

# =============================================================================
# MODELS CONFIGURATION
# =============================================================================

# We keep the model IDs that work well for this project, 
# but route them through the multi-key client.
MODELS = {
    # Vision/OCR Model - Best for reading invoices, notices, documents
    "ocr": "qwen/qwen2.5-vl-7b-instruct:free",
    
    # Logic/Reasoning Model - Best for tax rules, legal analysis, complex calculations
    "logic": "nousresearch/hermes-3-llama-3.1-405b:free",
    
    # Chat/UI Model - Best for natural language, user interactions, summaries
    "chat": "meta-llama/llama-3.1-405b-instruct:free",
    
    # Fast Chat Model - ULTRA-FAST for simple queries (2-5 second responses)
    "chat_fast": "meta-llama/llama-3.1-8b-instruct:free"
}

MODEL_DESCRIPTIONS = {
    "ocr": "Qwen2.5-VL 7B (Vision/OCR)",
    "logic": "Hermes 3 405B (Logic/Reasoning)",
    "chat": "Llama 3.1 405B (Chat/UI)",
    "chat_fast": "Llama 3.1 8B (Fast Chat)"
}

# =============================================================================
# CORE API FUNCTIONS (ASYNC WRAPPERS)
# =============================================================================

# Note: The original implementation was synchronous (using requests).
# We are moving to async (using aiohttp in openrouter_client).
# Steps to migrate:
# 1. Update these wrapper functions to be `async def`.
# 2. Update `main.py` to `await` these calls.

async def call_openrouter(
    model_type: str, 
    messages: List[Dict[str, Any]], 
    max_tokens: int = 4096,
    temperature: float = None,
    response_format: str = None
) -> str:
    """
    Universal OpenRouter API caller using the multi-key client.
    """
    if model_type not in MODELS:
        raise ValueError(f"Unknown model type: {model_type}")
    
    if temperature is None:
        temperature = 0.3 if model_type == "logic" else 0.7
        
    model_id = MODELS[model_type]
    json_mode = (response_format == "json_object")
    
    print(f"🤖 Calling {MODEL_DESCRIPTIONS[model_type]} via Multi-Key Client...")
    
    try:
        response = await client.completion(
            messages=messages,
            model_id=model_id, # Override client default routing
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=json_mode
        )
        
        # If response is dict (JSON mode parsed), convert back to string for compatibility
        # with expected return type of str, OR keep as dict if caller expects it?
        # Original `call_openrouter` returned `content` string.
        # `client.completion` returns dict if json_mode=True, else string.
        # We should probably standardize to string here to match legacy expectation,
        # unless we update callers.
        # But wait, `call_openrouter` docstring says "Returns String response".
        
        if isinstance(response, (dict, list)):
            return json.dumps(response)
            
        print(f"✅ {MODEL_DESCRIPTIONS[model_type]} responded successfully")
        return response
        
    except Exception as e:
        print(f"❌ API Error: {e}")
        raise Exception(f"OpenRouter API error: {str(e)}")

async def call_vision_model(
    image_base64: str, 
    prompt: str,
    mime_type: str = "image/jpeg",
    max_tokens: int = 2048
) -> str:
    messages = [{
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            {
                "type": "image_url", 
                "image_url": {
                    "url": f"data:{mime_type};base64,{image_base64}"
                }
            }
        ]
    }]
    return await call_openrouter("ocr", messages, max_tokens=max_tokens, temperature=0.2)


async def call_logic_model(prompt: str, max_tokens: int = 2048) -> str:
    messages = [{"role": "user", "content": prompt}]
    return await call_openrouter("logic", messages, max_tokens=max_tokens, temperature=0.3)


async def call_chat_model(prompt: str, max_tokens: int = 2048, system_prompt: str = None) -> str:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    return await call_openrouter("chat", messages, max_tokens=max_tokens, temperature=0.7)


async def call_fast_chat_model(prompt: str, max_tokens: int = 512, system_prompt: str = None) -> str:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    return await call_openrouter("chat_fast", messages, max_tokens=max_tokens, temperature=0.7)

# =============================================================================
# HELPER FUNCTIONS (UNCHANGED)
# =============================================================================

def clean_json_response(text: str) -> str:
    """Clean JSON from markdown code blocks."""
    if not text: return "{}"
    text = text.replace("```json", "").replace("```", "").strip()
    import re
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    return match.group(1) if match else text

def encode_image_to_base64(file_bytes: bytes) -> str:
    return base64.b64encode(file_bytes).decode('utf-8')
