import torch
import transformers
import torch.nn.functional as F
import sys

print("Starting script...")
print(f"Python version: {sys.version}")
print(f"PyTorch version: {torch.__version__}")
print(f"Transformers version: {transformers.__version__}")

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
    
    def detect(self, text):
        """
        Detect if the given text is AI-generated.
        Returns the probability that the text is AI-generated.
        """
        if isinstance(text, str):
            text = [text]
            
        with torch.no_grad():
            print("Tokenizing input...")
            inputs = self.tokenizer(text, padding=True, truncation=True, max_length=512, return_tensors="pt")
            inputs = {k:v.to(self.device) for k,v in inputs.items()}
            print("Running detection...")
            output_probs = F.log_softmax(self.detector(**inputs).logits,-1)[:,0].exp().tolist()
            
        if len(output_probs) == 1:
            return output_probs[0]
        return output_probs

def main():
    print("Creating detector instance...")
    detector = AIDetector()
    print("Detector ready!")
    
    while True:
        text = input("\nEnter text to check (or 'quit' to exit): ")
        if text.lower() == 'quit':
            break
            
        probability = detector.detect(text)
        print(f"\nProbability that the text is AI-generated: {probability:.4f}")

if __name__ == "__main__":
    main() 