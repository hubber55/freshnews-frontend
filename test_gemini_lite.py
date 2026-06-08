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
        title, summary, tags, faq, bogus_comments = result
        output = {
            "title": title,
            "summary": summary,
            "tags": tags,
            "faq": faq,
            "bogus_comments": bogus_comments
        }
        with open("gemini_lite_test_result.json", "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        
        print("\n[SUCCESS] Gemini Flash Lite Integration Successful! Result saved to gemini_lite_test_result.json")
    else:
        print("\n[FAILED] Gemini Flash Lite Summarization Failed.")

def test_fact_preservation():
    test_article = {
        "title": "മന്ത്രി സണ്ണി ജോസഫിനെതിരെ മുഖ്യമന്ത്രി വി.ഡി. സതീശൻ",
        "description": "മന്ത്രി സണ്ണി ജോസഫ് തന്റെ സ്വന്തം പേഴ്സണൽ സ്റ്റാഫിൽ ബന്ധുവിനെ നിയമിച്ചതിൽ വൻ വിവാദം. ഇതിനെതിരെ മുഖ്യമന്ത്രി വി.ഡി. സതീശൻ ശക്തമായ നിലപാടെടുത്തു. അദ്ദേഹം പറഞ്ഞു: ഈ നടപടി അംഗീകരിക്കാൻ കഴിയില്ല. ഇതോടെയാണ് അഡീഷണൽ പ്രൈവറ്റ് സെക്രട്ടറി സ്ഥാനം ബെന്നി തോമസ് രാജിവെച്ചത്."
    }
    
    print("\n--- Testing Fact/Role Preservation (V.D. Satheesan as Chief Minister) ---")
    result = summarize_article(test_article)
    if result:
        title, summary, tags, faq, bogus_comments = result
        print("Generated Title:", title)
        print("Generated Summary:\n", summary)
        
        if "പ്രതിപക്ഷ" in summary or "പ്രതിപക്ഷ" in title:
            print("\n[FAILED] FACT PRESERVATION FAILED: AI corrected Chief Minister to Opposition Leader.")
        else:
            print("\n[SUCCESS] FACT PRESERVATION SUCCESSFUL: AI strictly followed the source text.")
    else:
        print("\n[FAILED] Fact Preservation Test Failed.")

if __name__ == "__main__":
    test_gemini()
    test_fact_preservation()
