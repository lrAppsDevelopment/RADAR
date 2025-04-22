import torch
import transformers
import torch.nn.functional as F
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class AIDetector:
    def __init__(self, device="cuda" if torch.cuda.is_available() else "cpu"):
        print(f"Initializing detector with device: {device}")
        self.device = device
        print("Loading model...")
        self.detector = transformers.AutoModelForSequenceClassification.from_pretrained("TrustSafeAI/RADAR-Vicuna-7B")
        print("Loading tokenizer...")
        self.tokenizer = transformers.AutoTokenizer.from_pretrained("TrustSafeAI/RADAR-Vicuna-7B")
        self.detector.eval()
        self.detector.to(device)
        print("Model loaded successfully!")
    
    def detect(self, text, title=""):
        """
        Detect if the given text is AI-generated.
        Returns the probability that the text is AI-generated.
        """
        if isinstance(text, str):
            text = [text]
            
        with torch.no_grad():
            inputs = self.tokenizer(text, padding=True, truncation=True, max_length=512, return_tensors="pt")
            inputs = {k:v.to(self.device) for k,v in inputs.items()}
            output_probs = F.log_softmax(self.detector(**inputs).logits,-1)[:,0].exp().tolist()
            
        if len(output_probs) == 1:
            return output_probs[0]
        return output_probs

# Initialize detector
detector = AIDetector()

@app.route('/detect', methods=['POST'])
def detect_text():
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    title = data.get('title', 'Untitled post')
    
    probability = detector.detect(text)
    is_ai_generated = probability > 0.7  # Default threshold
    
    return jsonify({
        'text': text[:100] + '...' if len(text) > 100 else text,  # Keep snippet just for the response
        'title': title,
        'ai_probability': probability,
        'is_ai_generated': is_ai_generated
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 