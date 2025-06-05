from flask import Flask, request, jsonify, send_from_directory, render_template
import pickle
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import os
from dotenv import load_dotenv
import requests

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
load_dotenv(".env")
# Загрузка модели
try:
    with open('linear_model.pkl', 'rb') as f:
        model = pickle.load(f)
    print("Модель успешно загружена")
except Exception as e:
    print(f"Ошибка загрузки модели: {e}")
    model = None
def get_exchange_rate():
    api_key = os.getenv('EXCHANGE_RATE_API_KEY')
    base_url = os.getenv('EXCHANGE_RATE_URL')
    response = requests.get(f"{base_url}/{api_key}/latest/USD")
    return response.json()['conversion_rates']['RUB']
    
def create_correlation_plot(df):
    sns.heatmap(df.corr(), annot=True, cmap='coolwarm', fmt=".2f")
    plt.title("Матрица корреляции")
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def create_prediction_plot(actual, predicted):
    plt.scatter(actual, predicted, color='#D81B60')
    plt.plot([actual.min(), actual.max()], [actual.min(), actual.max()], 'k--')
    plt.xlabel("Фактические продажи")
    plt.ylabel("Прогнозируемые продажи")
    plt.title("Фактические vs Прогнозируемые продажи")
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    if request.method == 'POST':
        if 'file' in request.files:
                file = request.files['file']
                if file.filename == '':
                    return jsonify({"error": "No selected file"}), 400
                
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
                file.save(filepath)
                
                if file.filename.endswith('.csv'):
                    df = pd.read_csv(filepath)
                else:
                    df = pd.read_excel(filepath)
                
                required = ['TV', 'Radio', 'Newspaper', 'Sales']
                if not all(col in df.columns for col in required):
                    return jsonify({"error": f"Файл должен содержать колонки: {', '.join(required)}"}), 400
                df.rename({'TV':'Телевиденье', 'Radio':'Радио', 'Newspaper':'Газета','Sales':'Продажа'}, axis=1, inplace=True)
                X = df[['Телевиденье', 'Радио', 'Газета']]
                predictions = model.predict(X)
                
                corr_plot = create_correlation_plot(df)
                pred_plot = create_prediction_plot(df['Продажа'], predictions)
                
                return jsonify({
                    "predictions": predictions.tolist(),
                    "actual": df['Продажа'].tolist(),
                    "correlation_plot": f"data:image/png;base64,{corr_plot}",
                    "prediction_plot": f"data:image/png;base64,{pred_plot}",
                    "columns": df.columns.tolist()
                })
            
        else:
            data = request.json
            required = ['Телевиденье', 'Радио', 'Газета']
            if not all(key in data for key in required):
                return jsonify({"error": f"Необходимы поля: {', '.join(required)}"}), 400
            
            X = pd.DataFrame([[
                float(data['Телевиденье']),
                float(data['Радио']),
                float(data['Газета'])
            ]], columns= ['Телевиденье', 'Радио', 'Газета'])
            
            prediction = model.predict([[float(data['Телевиденье']),float(data['Радио']),float(data['Газета'])]])
            
            exchange_rate = get_exchange_rate()
            return jsonify({"prediction": float(prediction[0]),
                            "prediction_rub": float(prediction[0]) * float(exchange_rate),
                            "exchange_rate": exchange_rate})


@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)