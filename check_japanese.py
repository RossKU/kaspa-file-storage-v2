#!/usr/bin/env python3
import re

def check_japanese(filename):
    """Check for Japanese characters in a file"""
    
    # Japanese character ranges
    hiragana = r'[\u3040-\u309F]'
    katakana = r'[\u30A0-\u30FF]'
    kanji = r'[\u4E00-\u9FAF]'
    japanese_punctuation = r'[\u3000-\u303F]'
    
    patterns = {
        'Hiragana': hiragana,
        'Katakana': katakana,
        'Kanji': kanji,
        'Japanese Punctuation': japanese_punctuation
    }
    
    results = {}
    total_count = 0
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
            
            for name, pattern in patterns.items():
                matches = re.findall(pattern, content)
                if matches:
                    results[name] = {
                        'count': len(matches),
                        'unique': len(set(matches)),
                        'samples': list(set(matches))[:10]  # First 10 unique chars
                    }
                    total_count += len(matches)
    
    except Exception as e:
        print(f"Error reading file: {e}")
        return
    
    # Report results
    print("=" * 60)
    print("JAPANESE CHARACTER ANALYSIS REPORT")
    print("=" * 60)
    print(f"File: {filename}")
    print("-" * 60)
    
    if total_count == 0:
        print("✅ NO JAPANESE CHARACTERS FOUND!")
        print("The file is completely free of Japanese text.")
    else:
        print(f"⚠️ Found {total_count} Japanese characters:")
        print("-" * 60)
        for char_type, data in results.items():
            print(f"\n{char_type}:")
            print(f"  Total occurrences: {data['count']}")
            print(f"  Unique characters: {data['unique']}")
            print(f"  Samples: {', '.join(data['samples'])}")
    
    print("=" * 60)
    
    # Also check for common Japanese words
    common_words = ['です', 'ます', 'ました', 'ください', 'ありがとう', 
                    'こんにちは', 'さようなら', 'はい', 'いいえ']
    
    found_words = []
    for word in common_words:
        if word in content:
            found_words.append(word)
    
    if found_words:
        print(f"\n⚠️ Found common Japanese words: {', '.join(found_words)}")
    else:
        print("\n✅ No common Japanese words found.")
    
    print("=" * 60)
    
    return total_count == 0

if __name__ == "__main__":
    is_clean = check_japanese("index.html")
    if is_clean:
        print("\n🎉 TRANSLATION COMPLETE: 100% English!")
    else:
        print("\n⚠️ Japanese characters still present in the file.")