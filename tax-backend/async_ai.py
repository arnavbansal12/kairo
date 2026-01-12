# async_ai.py
# -----------------------------------------------------------------------------
# ASYNC AI PIPELINE - High-Performance OpenRouter Integration
# Uses AsyncOpenAI for non-blocking API calls with concurrent processing
# -----------------------------------------------------------------------------

import asyncio
import base64
import json
import re
from typing import Dict, Any, Optional, List
from openai import AsyncOpenAI

# =============================================================================
# CONFIGURATION
# =============================================================================

OPENROUTER_API_KEY = "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"

# Initialize Async Client (single instance for connection pooling)
async_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
    default_headers={
        "HTTP-Referer": "https://taxai.local",
        "X-Title": "Tax.AI Enterprise"
    }
)

# Model Configuration
MODELS = {
    "ocr": "qwen/qwen2.5-vl-32b-instruct",      # Vision/OCR - Best for documents
    "logic": "nousresearch/hermes-3-llama-3.1-405b",  # Reasoning - Tax/Legal analysis
    "chat": "meta-llama/llama-3.1-405b-instruct"      # Chat - User interactions
}

# =============================================================================
# ASYNC API CALLS - Non-blocking, concurrent execution
# =============================================================================

async def call_ocr_async(
    image_b64: str,
    prompt: str,
    mime_type: str = "image/jpeg",
    max_tokens: int = 4096
) -> str:
    """
    Async OCR call to Qwen2.5-VL vision model.
    Non-blocking - can process multiple images concurrently.
    """
    try:
        print(f"🔄 [ASYNC] OCR starting...")
        
        response = await async_client.chat.completions.create(
            model=MODELS["ocr"],
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{image_b64}"}
                    }
                ]
            }],
            max_tokens=max_tokens,
            temperature=0.2
        )
        
        result = response.choices[0].message.content
        print(f"✅ [ASYNC] OCR complete")
        return result
        
    except Exception as e:
        print(f"❌ [ASYNC] OCR error: {e}")
        raise


async def call_logic_async(prompt: str, max_tokens: int = 4096) -> str:
    """
    Async call to Hermes 3 405B for complex reasoning.
    Best for: Tax rules, legal analysis, HSN classification.
    """
    try:
        print(f"🔄 [ASYNC] Logic starting...")
        
        response = await async_client.chat.completions.create(
            model=MODELS["logic"],
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.3
        )
        
        result = response.choices[0].message.content
        print(f"✅ [ASYNC] Logic complete")
        return result
        
    except Exception as e:
        print(f"❌ [ASYNC] Logic error: {e}")
        raise


async def call_chat_async(
    prompt: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 4096
) -> str:
    """
    Async call to Llama 3.1 405B for user interactions.
    Best for: Natural language, summaries, explanations.
    """
    try:
        print(f"🔄 [ASYNC] Chat starting...")
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        response = await async_client.chat.completions.create(
            model=MODELS["chat"],
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.7
        )
        
        result = response.choices[0].message.content
        print(f"✅ [ASYNC] Chat complete")
        return result
        
    except Exception as e:
        print(f"❌ [ASYNC] Chat error: {e}")
        raise


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def clean_json_response(text: str) -> str:
    """Extract JSON from markdown code blocks."""
    text = text.replace("```json", "").replace("```", "").strip()
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    return match.group(1) if match else text


# =============================================================================
# TEST FUNCTION
# =============================================================================

async def test_async_models():
    """Test all async model calls."""
    print("\n" + "="*60)
    print("TESTING ASYNC AI PIPELINE")
    print("="*60)
    
    # Test Chat (fastest)
    print("\n1. Testing Async Chat...")
    try:
        result = await call_chat_async("Say 'Async works!' in 3 words.")
        print(f"   Response: {result[:50]}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test Logic
    print("\n2. Testing Async Logic...")
    try:
        result = await call_logic_async("What is 18% GST on 1000 rupees? Answer in 1 line.")
        print(f"   Response: {result[:50]}")
    except Exception as e:
        print(f"   Error: {e}")
    
    print("\n" + "="*60)
    print("ASYNC TEST COMPLETE")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(test_async_models())
