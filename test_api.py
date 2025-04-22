import requests
import json

# Test data - one human-like text and one likely AI-generated text
test_texts = [
    "Just got back from the store. They were out of milk again! So frustrating.",
    "The mitochondrion is a double membrane-bound organelle found in most eukaryotic organisms. Mitochondria generate most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy. The mitochondrion is popularly nicknamed the powerhouse of the cell, a phrase coined by Philip Siekevitz in a 1957 article of the same name."
]

# Test the API endpoint
url = "http://localhost:5000/detect"

print("Testing API endpoint...")
for i, text in enumerate(test_texts):
    try:
        response = requests.post(
            url,
            json={"text": text}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\nTest {i+1}:")
            print(f"Text: {text[:50]}...")
            print(f"AI Probability: {result['ai_probability']:.4f}")
            print(f"Is AI Generated: {result['is_ai_generated']}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Exception occurred: {e}")

print("\nAPI test complete.") 