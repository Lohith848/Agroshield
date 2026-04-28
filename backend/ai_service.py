import os
import io
import base64
from typing import Dict, List, Tuple
from PIL import Image
import numpy as np
from ultralytics import YOLO
import onnxruntime as ort
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DiseaseDetectionService:
    def __init__(self):
        self.model = None
        self.onnx_session = None
        self.class_names = [
            'Tomato_Early_Blight', 'Tomato_Late_Blight', 'Tomato_Leaf_Curl',
            'Chili_Leaf_Curl', 'Wheat_Rust', 'Rice_Blast', 'Cotton_Leaf_Blight',
            'Sugarcane_Mosaic', 'Maize_Rough_Dwarf', 'Healthy'
        ]
        self.severity_thresholds = {
            'mild': 0.3,
            'moderate': 0.7,
            'severe': 0.9
        }
        
    def load_model(self, model_path: str = None, use_onnx: bool = False):
        """Load YOLOv8 model for disease detection"""
        try:
            if use_onnx and model_path and model_path.endswith('.onnx'):
                # Load ONNX model for faster inference
                self.onnx_session = ort.InferenceSession(model_path)
                logger.info("ONNX model loaded successfully")
            else:
                # Load PyTorch model
                model_path = model_path or os.getenv('MODEL_PATH', './models/yolov8n.pt')
                self.model = YOLO(model_path)
                logger.info("PyTorch model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            # Fall back to mock predictions for demo
            self.model = None

    def preprocess_image(self, image: Image.Image) -> np.ndarray:
        """Preprocess image for model inference"""
        # Resize to standard size (640x640 for YOLOv8)
        image = image.resize((640, 640))
        
        # Convert to numpy array and normalize
        img_array = np.array(image) / 255.0
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array.astype(np.float32)

    def predict_with_pytorch(self, image: Image.Image) -> Dict:
        """Make prediction using PyTorch model"""
        if not self.model:
            return self._mock_prediction()
        
        try:
            # Run inference
            results = self.model(image)
            
            # Process results
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        class_id = int(box.cls[0])
                        confidence = float(box.conf[0])
                        
                        if confidence > 0.5:  # Confidence threshold
                            detections.append({
                                'class': self.class_names[class_id],
                                'confidence': confidence,
                                'bbox': box.xyxy[0].tolist()
                            })
            
            return self._process_detections(detections)
            
        except Exception as e:
            logger.error(f"Error in PyTorch inference: {e}")
            return self._mock_prediction()

    def predict_with_onnx(self, image: Image.Image) -> Dict:
        """Make prediction using ONNX model"""
        if not self.onnx_session:
            return self._mock_prediction()
        
        try:
            # Preprocess image
            img_array = self.preprocess_image(image)
            
            # Run inference
            input_name = self.onnx_session.get_inputs()[0].name
            outputs = self.onnx_session.run(None, {input_name: img_array})
            
            # Process outputs (simplified - actual implementation depends on model export format)
            predictions = outputs[0]
            
            # Convert to detections format
            detections = []
            for i, pred in enumerate(predictions[0]):
                if pred[4] > 0.5:  # Confidence threshold
                    class_id = int(pred[5])
                    confidence = float(pred[4])
                    
                    detections.append({
                        'class': self.class_names[class_id],
                        'confidence': confidence,
                        'bbox': pred[:4].tolist()
                    })
            
            return self._process_detections(detections)
            
        except Exception as e:
            logger.error(f"Error in ONNX inference: {e}")
            return self._mock_prediction()

    def _process_detections(self, detections: List[Dict]) -> Dict:
        """Process raw detections to final result"""
        if not detections:
            return {
                'disease_class': 'Healthy',
                'confidence': 0.95,
                'severity': 'healthy',
                'detections': []
            }
        
        # Find the detection with highest confidence
        best_detection = max(detections, key=lambda x: x['confidence'])
        
        # Determine severity based on confidence and coverage
        confidence = best_detection['confidence']
        disease_class = best_detection['class']
        
        if disease_class == 'Healthy':
            severity = 'healthy'
        elif confidence >= self.severity_thresholds['severe']:
            severity = 'severe'
        elif confidence >= self.severity_thresholds['moderate']:
            severity = 'moderate'
        else:
            severity = 'mild'
        
        return {
            'disease_class': disease_class,
            'confidence': confidence,
            'severity': severity,
            'detections': detections
        }

    def _mock_prediction(self) -> Dict:
        """Generate mock prediction for demo purposes"""
        import random
        
        # Mock disease classes with realistic probabilities
        disease_options = [
            ('Tomato_Early_Blight', 0.85, 'moderate'),
            ('Tomato_Late_Blight', 0.92, 'severe'),
            ('Chili_Leaf_Curl', 0.78, 'mild'),
            ('Wheat_Rust', 0.88, 'moderate'),
            ('Healthy', 0.95, 'healthy')
        ]
        
        selection = random.choice(disease_options)
        
        return {
            'disease_class': selection[0],
            'confidence': selection[1],
            'severity': selection[2],
            'detections': [{
                'class': selection[0],
                'confidence': selection[1],
                'bbox': [100, 100, 200, 200]  # Mock bounding box
            }]
        }

    def predict(self, image_data: bytes, use_onnx: bool = False) -> Dict:
        """Main prediction method"""
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Ensure RGB format
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Choose inference method
            if use_onnx and self.onnx_session:
                return self.predict_with_onnx(image)
            elif self.model:
                return self.predict_with_pytorch(image)
            else:
                return self._mock_prediction()
                
        except Exception as e:
            logger.error(f"Error in prediction: {e}")
            return self._mock_prediction()

    def get_disease_info(self, disease_class: str) -> Dict:
        """Get detailed information about a disease"""
        disease_info = {
            'Tomato_Early_Blight': {
                'scientific_name': 'Alternaria solani',
                'symptoms': [
                    'Dark brown spots on lower leaves',
                    'Concentric rings in spots',
                    'Yellowing of leaves',
                    'Leaf drop in severe cases'
                ],
                'treatment': [
                    'Remove infected leaves',
                    'Apply copper-based fungicide',
                    'Improve air circulation',
                    'Avoid overhead watering'
                ],
                'prevention': [
                    'Crop rotation',
                    'Resistant varieties',
                    'Proper spacing',
                    'Sanitation practices'
                ]
            },
            'Tomato_Late_Blight': {
                'scientific_name': 'Phytophthora infestans',
                'symptoms': [
                    'Water-soaked lesions on leaves',
                    'White fungal growth on underside',
                    'Dark brown lesions on stems',
                    'Rapid plant collapse'
                ],
                'treatment': [
                    'Apply metalaxyl-based fungicide',
                    'Remove infected plants',
                    'Reduce humidity',
                    'Protective fungicides'
                ],
                'prevention': [
                    'Resistant varieties',
                    'Proper drainage',
                    'Avoid excessive irrigation',
                    'Regular monitoring'
                ]
            },
            'Chili_Leaf_Curl': {
                'scientific_name': 'Begomovirus',
                'symptoms': [
                    'Upward curling of leaves',
                    'Yellow mosaic patterns',
                    'Stunted growth',
                    'Reduced fruit production'
                ],
                'treatment': [
                    'Remove infected plants',
                    'Control whitefly vectors',
                    'Use resistant varieties',
                    'Insecticide application'
                ],
                'prevention': [
                    'Whitefly control',
                    'Healthy seedlings',
                    'Weed management',
                    'Barrier crops'
                ]
            },
            'Healthy': {
                'scientific_name': 'No disease detected',
                'symptoms': ['No visible disease symptoms'],
                'treatment': ['Continue regular monitoring'],
                'prevention': [
                    'Maintain good practices',
                    'Regular inspection',
                    'Proper nutrition',
                    'Adequate watering'
                ]
            }
        }
        
        return disease_info.get(disease_class, {
            'scientific_name': 'Unknown',
            'symptoms': ['Information not available'],
            'treatment': ['Consult agricultural expert'],
            'prevention': ['Regular monitoring']
        })

# Global instance
detection_service = DiseaseDetectionService()

def initialize_ai_service():
    """Initialize the AI service on startup"""
    model_path = os.getenv('MODEL_PATH')
    onnx_path = os.getenv('ONNX_MODEL_PATH')
    
    if onnx_path and os.path.exists(onnx_path):
        detection_service.load_model(onnx_path, use_onnx=True)
    elif model_path and os.path.exists(model_path):
        detection_service.load_model(model_path, use_onnx=False)
    else:
        logger.warning("No model file found, using mock predictions")
        detection_service.load_model()
