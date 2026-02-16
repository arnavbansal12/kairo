
import os
import time
import json
import logging
import asyncio
from typing import List, Dict, Optional, Any, AsyncGenerator
from dataclasses import dataclass
import aiohttp
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OpenRouterClient")

load_dotenv()

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

# ─── Model Routing ───
MODELS = {
    "chat": "deepseek/deepseek-r1-0528:free",          # Best reasoning, 164K ctx
    "analyze": "meta-llama/llama-3.3-70b-instruct:free", # Precise JSON, 128K ctx
    "search": "google/gemma-3-27b-it:free",              # Fast parsing, 131K ctx
    "report": "qwen/qwen3-coder:free",                   # 262K ctx, structured output
    "fallback": "openrouter/free",                        # Auto-routes to best available
}

@dataclass
class KeyState:
    key: str
    minute_count: int = 0
    minute_reset: float = 0.0
    daily_count: int = 0
    daily_reset: float = 0.0

class OpenRouterClient:
    _instance = None
    _key_states: List[KeyState] = []
    _current_key_index: int = 0

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OpenRouterClient, cls).__new__(cls)
            cls._instance._init_keys()
        return cls._instance

    def _init_keys(self):
        """Initialize key states from environment variable."""
        raw_keys = os.getenv("OPENROUTER_API_KEYS", "")
        keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        
        if not keys:
            logger.warning("No OPENROUTER_API_KEYS configured!")
            return

        now = time.time()
        self._key_states = [
            KeyState(
                key=key,
                minute_reset=now + 60,
                daily_reset=self._get_end_of_day()
            )
            for key in keys
        ]
        logger.info(f"Initialized {len(self._key_states)} OpenRouter API keys.")

    def _get_end_of_day(self) -> float:
        # Simple EOD calculation (UTC based for simplicity)
        # For production apps, consider timezone properly
        now = time.time()
        seconds_in_day = 86400
        return now + (seconds_in_day - (now % seconds_in_day))

    def _get_next_key(self) -> KeyState:
        """Get next available key via round-robin, skipping rate-limited ones."""
        if not self._key_states:
             raise ValueError("No API keys available.")

        total_keys = len(self._key_states)
        now = time.time()

        for _ in range(total_keys):
            idx = (self._current_key_index + _) % total_keys
            state = self._key_states[idx]

            # Reset minute window
            if now >= state.minute_reset:
                state.minute_count = 0
                state.minute_reset = now + 60

            # Reset daily window
            if now >= state.daily_reset:
                state.daily_count = 0
                state.daily_reset = self._get_end_of_day()

            # Check limits (20/min, 50/day per free key - conservative estimates)
            if state.minute_count < 20 and state.daily_count < 50:
                state.minute_count += 1
                state.daily_count += 1
                self._current_key_index = (idx + 1) % total_keys
                return state

        # Fallback if all strictly limited (should ideally wait, but we return next for now and handle 429)
        fallback = self._key_states[self._current_key_index]
        self._current_key_index = (self._current_key_index + 1) % total_keys
        return fallback

    async def completion(
        self,
        messages: List[Dict[str, str]],
        model_task: str = "fallback",
        model_id: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        json_mode: bool = False,
        stream: bool = False,
        retry_count: int = 0
    ) -> Any:
        
        if retry_count > 5:
            raise Exception("Max retries exceeded for OpenRouter API.")

        key_state = self._get_next_key()
        
        # Use explicit model_id if provided, else use task mapping
        if model_id:
            model = model_id
        else:
            model = MODELS.get(model_task, MODELS["fallback"])

        headers = {
            "Authorization": f"Bearer {key_state.key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://kairo.app",
            "X-Title": "KAIRO",
        }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }

        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(OPENROUTER_BASE_URL, headers=headers, json=payload) as response:
                    
                    if response.status == 429:
                        logger.warning(f"Rate limited on key {key_state.key[:10]}... Retrying.")
                        # Mark key as exhausted for a bit (simple backoff handled by rotation)
                        key_state.minute_count = 20 
                        await asyncio.sleep(0.5)
                        return await self.completion(messages, model_task, temperature, max_tokens, json_mode, stream, retry_count + 1)

                    if not response.ok:
                        error_text = await response.text()
                        logger.error(f"OpenRouter API Error {response.status}: {error_text}")
                        raise Exception(f"OpenRouter API Error: {response.status}")

                    if stream:
                        # For stream, we'd need to return the generator
                        # This implementation simplifies to non-stream for now unless adapted
                        # To truly support stream in FastAPI, return StreamingResponse w/ this generator
                        pass # Setup generator here if needed
                        return response # Return response object for streaming handling by caller? 
                        # Ideally we wrap the stream generator.
                    
                    data = await response.json()
                    content = data["choices"][0]["message"]["content"]
                    
                    if json_mode:
                        try:
                            # Clean markdown code blocks if present
                            if "```json" in content:
                                content = content.split("```json")[1].split("```")[0].strip()
                            elif "```" in content:
                                content = content.split("```")[1].split("```")[0].strip()
                            return json.loads(content)
                        except json.JSONDecodeError:
                            logger.error("Failed to parse JSON response")
                            return {} # Or raise
                            
                    return content

        except Exception as e:
            logger.error(f"Request failed: {str(e)}")
            if retry_count < 3:
                await asyncio.sleep(1)
                return await self.completion(messages, model_task, temperature, max_tokens, json_mode, stream, retry_count + 1)
            raise e

# Global instance
client = OpenRouterClient()

async def get_ai_response(
    system_prompt: str,
    user_prompt: str,
    task: str = "chat",
    json_mode: bool = False
):
    """Simple wrapper for external use."""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    return await client.completion(messages, model_task=task, json_mode=json_mode)
