import google.generativeai as genai

GOOGLE_API_KEY = "AIzaSyDZ4WvJYP3A98kvLWM4MhVVU_s8y8V_hW0"
genai.configure(api_key=GOOGLE_API_KEY)

print("Checking available models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ Found: {m.name}")
except Exception as e:
    print(f"❌ Error: {e}")