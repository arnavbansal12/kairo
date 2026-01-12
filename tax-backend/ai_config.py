# ai_config.py
# -----------------------------------------------------------------------------
# MULTI-MODEL AI ARCHITECTURE - OpenRouter Configuration
# Routes requests to specialized models for optimal performance
# -----------------------------------------------------------------------------

import requests
import json
import base64
from typing import Optional, Dict, Any, List

# =============================================================================
# OPENROUTER CONFIGURATION
# =============================================================================

OPENROUTER_API_KEY = "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"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Model assignments
MODELS = {
    # Vision/OCR Model - Best for reading invoices, notices, documents
    # Using Qwen2.5-VL 32B on OpenRouter
    "ocr": "qwen/qwen2.5-vl-32b-instruct",
    
    # Logic/Reasoning Model - Best for tax rules, legal analysis, complex calculations
    "logic": "nousresearch/hermes-3-llama-3.1-405b",
    
    # Chat/UI Model - Best for natural language, user interactions, summaries
    "chat": "meta-llama/llama-3.1-405b-instruct"
}

# Model descriptions for debugging
MODEL_DESCRIPTIONS = {
    "ocr": "Qwen2.5-VL 32B (Vision/OCR)",
    "logic": "Hermes 3 405B (Logic/Reasoning)",
    "chat": "Llama 3.1 405B (Chat/UI)"
}


# =============================================================================
# CORE API FUNCTIONS
# =============================================================================

def call_openrouter(
    model_type: str, 
    messages: List[Dict[str, Any]], 
    max_tokens: int = 4096,
    temperature: float = None,
    response_format: str = None
) -> str:
    """
    Universal OpenRouter API caller.
    
    Args:
        model_type: "ocr", "logic", or "chat"
        messages: List of message dicts with role and content
        max_tokens: Maximum tokens in response
        temperature: Override default temperature (0.3 for logic, 0.7 for chat)
        response_format: Optional - set to "json_object" for JSON output
        
    Returns:
        String response from the model
    """
    if model_type not in MODELS:
        raise ValueError(f"Unknown model type: {model_type}. Use: ocr, logic, or chat")
    
    # Set temperature based on model type if not overridden
    if temperature is None:
        temperature = 0.3 if model_type == "logic" else 0.7
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://taxai.local",
        "X-Title": "Tax.AI Enterprise"
    }
    
    payload = {
        "model": MODELS[model_type],
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature
    }
    
    # Add response format if specified
    if response_format:
        payload["response_format"] = {"type": response_format}
    
    print(f"🤖 Calling {MODEL_DESCRIPTIONS[model_type]}...")
    
    try:
        response = requests.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=120  # 2 minute timeout for large models
        )
        response.raise_for_status()
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        print(f"✅ {MODEL_DESCRIPTIONS[model_type]} responded successfully")
        return content
        
    except requests.exceptions.Timeout:
        print(f"⏱️ Timeout calling {MODEL_DESCRIPTIONS[model_type]}")
        raise Exception(f"Model timeout: {model_type}")
    except requests.exceptions.RequestException as e:
        print(f"❌ API Error: {e}")
        raise Exception(f"OpenRouter API error: {str(e)}")
    except (KeyError, IndexError) as e:
        print(f"❌ Response parsing error: {e}")
        raise Exception(f"Invalid response format: {str(e)}")


def call_vision_model(
    image_base64: str, 
    prompt: str,
    mime_type: str = "image/jpeg",
    max_tokens: int = 4096
) -> str:
    """
    Call Qwen2.5-VL for image/document analysis.
    
    Args:
        image_base64: Base64 encoded image data
        prompt: Instructions for the vision model
        mime_type: Image MIME type (image/jpeg, image/png, etc.)
        max_tokens: Maximum tokens in response
        
    Returns:
        String response with extracted/analyzed content
    """
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
    
    return call_openrouter("ocr", messages, max_tokens=max_tokens, temperature=0.2)


def call_logic_model(prompt: str, max_tokens: int = 4096) -> str:
    """
    Call Hermes 3 405B for complex reasoning tasks.
    
    Use for:
    - Legal/tax analysis
    - GST rule interpretation
    - Notice reply drafting
    - HSN code classification
    - Calculation verification
    """
    messages = [{"role": "user", "content": prompt}]
    return call_openrouter("logic", messages, max_tokens=max_tokens, temperature=0.3)


def call_chat_model(prompt: str, max_tokens: int = 4096, system_prompt: str = None) -> str:
    """
    Call Llama 3.1 405B for user-facing interactions.
    
    Use for:
    - Natural language search/queries
    - News summarization
    - Friendly explanations
    - SQL generation from questions
    """
    messages = []
    
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    
    messages.append({"role": "user", "content": prompt})
    
    return call_openrouter("chat", messages, max_tokens=max_tokens, temperature=0.7)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def clean_json_response(text: str) -> str:
    """Clean JSON from markdown code blocks."""
    text = text.replace("```json", "").replace("```", "").strip()
    # Try to find JSON object
    import re
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    return match.group(1) if match else text


def encode_image_to_base64(file_bytes: bytes) -> str:
    """Convert file bytes to base64 string."""
    return base64.b64encode(file_bytes).decode('utf-8')


# =============================================================================
# TEST FUNCTION
# =============================================================================

def test_models():
    """Test all three models are working."""
    print("\n" + "="*60)
    print("TESTING MULTI-MODEL AI ARCHITECTURE")
    print("="*60)
    
    # Test Chat Model
    print("\n1. Testing Llama 3.1 (Chat)...")
    try:
        response = call_chat_model("Say 'Hello from Llama!' in exactly 3 words.")
        print(f"   Response: {response[:100]}")
        print("   ✅ Chat model working")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test Logic Model
    print("\n2. Testing Hermes 3 (Logic)...")
    try:
        response = call_logic_model("What GST rate applies to laptops (HSN 8471) in India? Answer in 1 sentence.")
        print(f"   Response: {response[:100]}")
        print("   ✅ Logic model working")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Vision model requires an actual image, skip for now
    print("\n3. Vision model (Qwen2.5-VL) - Requires image to test")
    print("   ⏭️ Skipped (will test with actual invoice upload)")
    
    print("\n" + "="*60)
    print("MODEL TEST COMPLETE")
    print("="*60 + "\n")


if __name__ == "__main__":
    test_models()
