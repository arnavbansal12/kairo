#!/usr/bin/env python3
"""Test script to verify fast AI model performance"""

import time
import sys
sys.path.insert(0, '/Users/arnavbansal/Desktop/GST_agent/tax-backend')

from ai_config import call_fast_chat_model, call_chat_model

print("=" * 60)
print("AI MODEL PERFORMANCE TEST")
print("=" * 60)

# Test 1: Fast Model (Llama 3.1 8B)
print("\n1. Testing FAST model (Llama 3.1 8B)...")
print("   Query: 'What is GST?'")
start = time.time()
try:
    response = call_fast_chat_model("What is GST? Answer in 1-2 sentences.")
    elapsed = time.time() - start
    print(f"   ✅ Response time: {elapsed:.2f}s")
    print(f"   Response: {response[:150]}...")
    
    if elapsed < 10:
        print(f"   🎉 SUCCESS! Fast model responded in {elapsed:.2f}s (target: < 10s)")
    else:
        print(f"   ⚠️  WARNING: Slower than expected ({elapsed:.2f}s)")
except Exception as e:
    print(f"   ❌ ERROR: {e}")

# Test 2: Check that complex model still works
print("\n2. Testing COMPLEX model (Llama 3.1 405B)...")
print("   Query: 'Explain GST Section 16'")
print("   (This may take 20-30 seconds - that's expected)")
start = time.time()
try:
    response = call_chat_model("What is GST Section 16? Answer in 1 sentence.", max_tokens=100)
    elapsed = time.time() - start
    print(f"   ✅ Response time: {elapsed:.2f}s")
    print(f"   Response: {response[:150]}...")
except Exception as e:
    print(f"   ❌ ERROR: {e}")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
