from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.efficientnet import preprocess_input
from PIL import Image
import numpy as np

app = Flask(__name__)
CORS(app)

MODEL_PATH = 'modelo.keras'
DATA_PATH = 'data.txt'
try:
    model = load_model(MODEL_PATH)
except Exception as e:
    model = None

actions = []
try:
    with open(DATA_PATH, 'r') as f:
        actions = [line.strip() for line in f.readlines()]
except Exception as e:
    pass

@app.route('/')
def index():
    return "Backend para Reconhecimento de Ações Humanas"

@app.route('/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({"error": "Modelo não carregado."}), 500
    if not actions:
        return jsonify({"error": "Nomes das ações não carregados."}), 500

    if 'images' not in request.files:
        return jsonify({"error": "Nenhuma imagem enviada."}), 400

    uploaded_images = request.files.getlist('images')
    results = []

    for uploaded_file in uploaded_images:
        if uploaded_file.filename == '':
            continue

        if not uploaded_file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            results.append({
                "filename": uploaded_file.filename,
                "error": "Formato de arquivo inválido. Apenas PNG, JPG, JPEG são permitidos."
            })
            continue

        try:
            img = Image.open(uploaded_file.stream).convert('RGB')
            img = img.resize((224, 224))
            img_array = np.array(img)
            img_array = np.expand_dims(img_array, axis=0)
            img_array = preprocess_input(img_array)

            predictions = model.predict(img_array)[0]
            
            top_5_indices = np.argsort(predictions)[::-1][:5]
            top_5_predictions = []
            for i in top_5_indices:
                if 0 <= i < len(actions):
                    top_5_predictions.append({
                        "action": actions[i],
                        "confidence": float(predictions[i])
                    })
                else:
                    top_5_predictions.append({
                        "action": "Desconhecida",
                        "confidence": float(predictions[i])
                    })

            results.append({
                "filename": uploaded_file.filename,
                "top_5_predictions": top_5_predictions
            })

        except Exception as e:
            results.append({
                "filename": uploaded_file.filename,
                "error": f"Erro ao processar imagem: {e}"
            })
    
    overall_predictions_count = {action: 0 for action in actions}
    total_predictions = 0

    for result in results:
        if "top_5_predictions" in result:
            if result["top_5_predictions"]:
                top_1_action = result["top_5_predictions"][0]["action"]
                if top_1_action in overall_predictions_count:
                    overall_predictions_count[top_1_action] += 1
                total_predictions += 1
    
    overall_percentages = {}
    if total_predictions > 0:
        for action, count in overall_predictions_count.items():
            overall_percentages[action] = (count / total_predictions) * 100
    
    return jsonify({
        "image_results": results,
        "overall_percentages": overall_percentages
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
