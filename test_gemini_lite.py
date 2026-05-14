import logging
import json
from summarizer import summarize_article

# Setup logging
logging.basicConfig(level=logging.INFO)

def test_gemini():
    test_article = {
        "title": "കൊച്ചിയിൽ നാവികസേനയുടെ പുതിയ കപ്പൽ കമ്മീഷൻ ചെയ്തു",
        "description": "ഇന്ത്യൻ നാവികസേനയുടെ കരുത്ത് വർദ്ധിപ്പിക്കുന്നതിനായി അത്യാധുനിക സൗകര്യങ്ങളോട് കൂടിയ പുതിയ കപ്പൽ കൊച്ചിയിൽ കമ്മീഷൻ ചെയ്തു. പ്രതിരോധ മന്ത്രിയുടെ സാന്നിധ്യത്തിൽ നടന്ന ചടങ്ങിൽ നാവികസേനാ മേധാവികൾ പങ്കെടുത്തു. സമുദ്ര സുരക്ഷ ഉറപ്പാക്കുന്നതിൽ ഈ കപ്പൽ നിർണ്ണായക പങ്കുവഹിക്കുമെന്ന് പ്രതിരോധ മന്ത്രാലയം അറിയിച്ചു."
    }
    
    print("\n--- Testing Gemini Flash Lite Summarization ---")
    result = summarize_article(test_article)
    
    if result:
        title, summary, tags, faq = result
        output = {
            "title": title,
            "summary": summary,
            "tags": tags,
            "faq": faq
        }
        with open("gemini_lite_test_result.json", "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        
        print("\n✅ Gemini Flash Lite Integration Successful! Result saved to gemini_lite_test_result.json")
    else:
        print("\n❌ Gemini Flash Lite Summarization Failed.")

if __name__ == "__main__":
    test_gemini()
