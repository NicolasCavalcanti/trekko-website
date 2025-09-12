import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine

app = Flask(__name__)
CORS(app)

database_url = os.getenv('DATABASE_URL')
if not database_url:
    db_user = os.getenv('DB_USER', 'root')
    db_password = os.getenv('DB_PASSWORD', 'password123')
    db_host = os.getenv('DB_HOST', 'localhost')
    db_name = os.getenv('DB_NAME', 'trekko_db')
    mysql_url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}/{db_name}?charset=utf8mb4"
    try:
        engine = create_engine(mysql_url)
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        database_url = mysql_url
        print("✅ Conectado ao MySQL com sucesso!")
    except Exception as e:
        print(f"⚠️ MySQL não disponível: {e}")
        db_dir = os.path.join(os.path.dirname(__file__), 'database')
        os.makedirs(db_dir, exist_ok=True)
        db_path = os.path.join(db_dir, 'app.db')
        database_url = f"sqlite:///{db_path}"
        print(f"🔄 Usando SQLite: {db_path}")

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

@app.route('/api/health')
def health_check():
    try:
        with app.app_context():
            db.engine.execute("SELECT 1")
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'message': 'Sistema funcionando corretamente'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'database': 'disconnected',
            'error': str(e)
        }), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
