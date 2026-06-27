import logging
from news_fetcher import is_primarily_malayalam

# Setup logging
logging.basicConfig(level=logging.INFO)

def test_malayalam_check():
    malayalam_text = "ലണ്ടൻ: പ്രായപൂർത്തിയാക്കാത്ത പെൺകുട്ടിയെ ലൈംഗികമായി പീഡിപ്പിച്ച കേസിൽ ജെഫ്രി എപ്സ്റ്റീൻ ജയിലിൽ ആയിരിക്കവെ അദ്ദേഹം രൂപീകരിച്ച ഒരു വ്യാജ കമ്പനിയുടെ ഓഫീസിൽ സാറാ ഫെർഗൂസൺ രണ്ട് തവണ സന്ദർശനം നടത്തിയതായി റിപ്പോർട്ട്."
    english_text = "NEWS EXCLUSIVE INVESTIGATION NEWS SERIES IN-DEPTH READERS CHOICE SURVEY EXPATRIATE EDITORIAL KERALAM INDIA WORLD SPECIAL REPORT JUDICIAL POLITICS CPI(M) 21st PARTY CONGRESS INDIA 2019 STATE NATIONAL FOREIGN AFFAIRS ANALYSIS PARLIAMENT ASSEMBLY CRICKET SPORTS CRICKET"
    mixed_text = "ലണ്ടൻ: Sarah Ferguson visited Jeffrey Epstein's office two times. പ്രായപൂർത്തിയാക്കാത്ത പെൺകുട്ടിയെ ലൈംഗികമായി പീഡിപ്പിച്ച കേസിൽ ജെഫ്രി എപ്സ്റ്റീൻ ജയിലിൽ ആയിരിക്കവെ അദ്ദേഹം രൂപീകരിച്ച ഒരു വ്യാജ കമ്പനിയുടെ ഓഫീസിൽ."

    print("Testing is_primarily_malayalam function...")
    
    res_ml = is_primarily_malayalam(malayalam_text)
    print(f"Malayalam text primarily Malayalam? {res_ml}")
    assert res_ml == True, "Failed: Malayalam text should be primarily Malayalam!"
    
    res_en = is_primarily_malayalam(english_text)
    print(f"English text primarily Malayalam? {res_en}")
    assert res_en == False, "Failed: English text should NOT be primarily Malayalam!"
    
    res_mixed = is_primarily_malayalam(mixed_text)
    print(f"Mixed text primarily Malayalam? {res_mixed}")
    assert res_mixed == True, "Failed: Mixed text with high Malayalam content should be primarily Malayalam!"

    print("Success! Malayalam script validation verified.")

if __name__ == "__main__":
    test_malayalam_check()
