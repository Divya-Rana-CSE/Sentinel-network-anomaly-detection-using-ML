from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import pandas as pd
import sqlite3
import threading
import time
import random
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Load model
MODEL_PATH = os.path.join('model', 'best_ids_model.pkl')
ENCODERS_PATH = os.path.join('model', 'encoders.pkl')
FEATURES_PATH = os.path.join('model', 'feature_names.pkl')

print("Loading model...")
try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    with open(ENCODERS_PATH, 'rb') as f:
        encoders = pickle.load(f)
    with open(FEATURES_PATH, 'rb') as f:
        feature_names = pickle.load(f)
    print("Model loaded successfully!")
except FileNotFoundError as e:
    print(f"Error: Model files not found. Please add .pkl files to backend/model/")
    print(f"   Missing: {e.filename}")

# Database setup
def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            prediction TEXT,
            confidence REAL,
            protocol TEXT,
            service TEXT,
            flag TEXT,
            src_bytes INTEGER,
            dst_bytes INTEGER
        )
    ''')
    conn.commit()
    conn.close()

init_db()


# ---------- Attack metadata ----------
# Static class -> human-readable description + recommended response.
# Used to surface "what this is" and "what to do" in the UI.

ATTACK_INFO = {
    'DoS': {
        'description': 'Denial-of-service attack — abnormal flood of connections trying to overwhelm a service.',
        'recommendation': 'Enable rate-limiting on the targeted service, block the source IP at the firewall, and scale upstream capacity if traffic is sustained.',
    },
    'Probe': {
        'description': 'Reconnaissance scan — an attacker is mapping your network for open ports or running services.',
        'recommendation': 'Tighten firewall rules to drop unsolicited probes, hide service banners, and alert your SOC for follow-up.',
    },
    'R2L': {
        'description': 'Remote-to-local intrusion — unauthorized access attempt from an external machine.',
        'recommendation': 'Force password rotation on the affected accounts, review failed-login logs, and enable multi-factor authentication.',
    },
    'U2R': {
        'description': 'Privilege escalation — an attacker is trying to gain root/admin rights from a normal user account.',
        'recommendation': 'Quarantine the host immediately, audit recent sudo/su usage, and check for installed rootkits.',
    },
}


def _attack_meta(label: str):
    """Return {description, recommendation} for a class label, or None for normal/unknown."""
    if not label:
        return None
    if label.lower() == 'normal' or label == '0':
        return None
    return ATTACK_INFO.get(label)


# ---------- Shared prediction helper ----------

def run_prediction(records):
    """Encode, predict, and persist. records: list[dict]. Returns list[dict] of results.

    Missing features are filled with safe defaults (0 for numeric, first known class
    for categorical) so partial inputs still produce a prediction. Accuracy degrades
    when many features are missing — that's the user's tradeoff.
    """
    df = pd.DataFrame(records)

    # Fill any missing model features so partial JSON inputs still work
    for col in feature_names:
        if col not in df.columns:
            if col in encoders:
                df[col] = encoders[col].classes_[0]
            else:
                df[col] = 0

    for col in ['protocol_type', 'service', 'flag']:
        if col in df.columns and col in encoders:
            df[col] = df[col].apply(
                lambda x: x if x in encoders[col].classes_ else encoders[col].classes_[0]
            )
            df[col] = encoders[col].transform(df[col])

    df = df[feature_names]

    predictions = model.predict(df)
    probabilities = model.predict_proba(df)

    results = []
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    try:
        for i, pred in enumerate(predictions):
            confidence = float(max(probabilities[i]) * 100)
            # Model can be binary (0/1) or multi-class strings ('Normal','DoS',...).
            # Anything that isn't normal/0 is treated as an attack.
            label = str(pred)
            is_attack = not (label == '0' or label.lower() == 'normal')
            row = records[i]

            cursor.execute('''
                INSERT INTO predictions
                (timestamp, prediction, confidence, protocol, service, flag, src_bytes, dst_bytes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                label,
                confidence,
                row.get('protocol_type', 'unknown'),
                row.get('service', 'unknown'),
                row.get('flag', 'unknown'),
                row.get('src_bytes', 0),
                row.get('dst_bytes', 0)
            ))

            meta = _attack_meta(label)
            results.append({
                "prediction": label,
                "confidence": round(confidence, 2),
                "is_attack": is_attack,
                "protocol": row.get('protocol_type', 'unknown'),
                "service": row.get('service', 'unknown'),
                "flag": row.get('flag', 'unknown'),
                "description": meta['description'] if meta else None,
                "recommendation": meta['recommendation'] if meta else None,
            })
        conn.commit()
    finally:
        conn.close()

    return results


# ---------- Routes ----------

@app.route('/')
def home():
    return jsonify({
        'status': 'running',
        'message': 'Sentinel IDS Backend Active',
        'model_loaded': 'model' in globals()
    })


@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        single_input = isinstance(data, dict)
        if single_input:
            data = [data]

        results = run_prediction(data)

        if single_input:
            r = results[0]
            return jsonify({
                'prediction': r['prediction'],
                'confidence': r['confidence'],
                'is_attack': r['is_attack'],
                'description': r['description'],
                'recommendation': r['recommendation'],
            })

        attack_count = sum(1 for r in results if r['is_attack'])
        return jsonify({
            'count': len(results),
            'attacks': attack_count,
            'normal': len(results) - attack_count,
            'results': results
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM predictions")
    total = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM predictions WHERE prediction='Attack'")
    attacks = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM predictions WHERE prediction='Normal'")
    normal = cursor.fetchone()[0]
    conn.close()
    return jsonify({
        'total': total,
        'attacks': attacks,
        'normal': normal,
        'attack_rate': round((attacks/total*100) if total > 0 else 0, 2)
    })


@app.route('/api/dashboard', methods=['GET'])
def dashboard_data():
    """Aggregated stats for the dashboard: totals, per-class counts,
    a per-minute time series for the last hour, and recent alerts."""
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    # Totals
    cursor.execute("SELECT COUNT(*) FROM predictions")
    total = cursor.fetchone()[0] or 0
    cursor.execute("SELECT COUNT(*) FROM predictions WHERE LOWER(prediction)='normal'")
    normal = cursor.fetchone()[0] or 0
    attacks = total - normal

    # Per-class breakdown
    cursor.execute("SELECT prediction, COUNT(*) FROM predictions GROUP BY prediction")
    by_class = {row[0]: row[1] for row in cursor.fetchall()}

    # Per-minute time series for the last 60 records' window
    cursor.execute("""
        SELECT substr(timestamp, 12, 5) AS minute,
               COUNT(*) AS total,
               SUM(CASE WHEN LOWER(prediction) != 'normal' THEN 1 ELSE 0 END) AS attacks
        FROM (SELECT * FROM predictions ORDER BY id DESC LIMIT 200)
        GROUP BY minute
        ORDER BY minute ASC
    """)
    timeseries = [
        {'minute': row[0], 'total': row[1], 'attacks': row[2] or 0}
        for row in cursor.fetchall()
    ]

    # Recent alerts (attacks only, last 10)
    cursor.execute("""
        SELECT timestamp, prediction, confidence, protocol, service, flag
        FROM predictions
        WHERE LOWER(prediction) != 'normal'
        ORDER BY id DESC LIMIT 10
    """)
    recent_alerts = []
    for row in cursor.fetchall():
        meta = _attack_meta(row[1])
        recent_alerts.append({
            'timestamp': row[0],
            'prediction': row[1],
            'confidence': row[2],
            'protocol': row[3],
            'service': row[4],
            'flag': row[5],
            'description': meta['description'] if meta else None,
        })

    # Last detection (most recent record)
    cursor.execute("SELECT timestamp FROM predictions ORDER BY id DESC LIMIT 1")
    last_row = cursor.fetchone()
    last_detection = last_row[0] if last_row else None

    conn.close()

    return jsonify({
        'totals': {
            'total': total,
            'attacks': attacks,
            'normal': normal,
            'attack_rate': round((attacks / total * 100) if total > 0 else 0, 2),
            'last_detection': last_detection,
        },
        'by_class': by_class,
        'timeseries': timeseries,
        'recent_alerts': recent_alerts,
    })


@app.route('/api/recent', methods=['GET'])
def get_recent():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM predictions ORDER BY id DESC LIMIT 20')
    results = []
    for row in cursor.fetchall():
        results.append({
            'id': row[0],
            'timestamp': row[1],
            'prediction': row[2],
            'confidence': row[3],
            'protocol': row[4],
            'service': row[5],
            'flag': row[6],
            'src_bytes': row[7],
            'dst_bytes': row[8]
        })
    conn.close()
    return jsonify(results)


# ---------- Live stream simulator ----------
# Streams rows from KDDTest+.txt through the model on a timer to simulate live
# traffic. The predictions are real; only the "live capture" is simulated.

NSL_KDD_COLUMNS = [
    'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes',
    'land', 'wrong_fragment', 'urgent', 'hot', 'num_failed_logins', 'logged_in',
    'num_compromised', 'root_shell', 'su_attempted', 'num_root',
    'num_file_creations', 'num_shells', 'num_access_files', 'num_outbound_cmds',
    'is_host_login', 'is_guest_login', 'count', 'srv_count', 'serror_rate',
    'srv_serror_rate', 'rerror_rate', 'srv_rerror_rate', 'same_srv_rate',
    'diff_srv_rate', 'srv_diff_host_rate', 'dst_host_count',
    'dst_host_srv_count', 'dst_host_same_srv_rate', 'dst_host_diff_srv_rate',
    'dst_host_same_src_port_rate', 'dst_host_srv_diff_host_rate',
    'dst_host_serror_rate', 'dst_host_srv_serror_rate', 'dst_host_rerror_rate',
    'dst_host_srv_rerror_rate'
]

TEST_DATA_PATH = os.path.join('..', 'notebooks', 'data', 'KDDTest+.txt')

stream_state = {
    'running': False,
    'thread': None,
    'started_at': None,
    'interval': 2.0,
    'session_total': 0,
    'session_attacks': 0,
    'session_normal': 0,
    'recent': [],   # newest first, capped at 20
}
stream_lock = threading.Lock()
_test_records_cache = None


def _load_test_records():
    """Load KDDTest+ once, return as list[dict] of feature-only records."""
    global _test_records_cache
    if _test_records_cache is not None:
        return _test_records_cache

    if not os.path.exists(TEST_DATA_PATH):
        raise FileNotFoundError(f"Test data not found at {TEST_DATA_PATH}")

    # File has 41 features + label (+ optional difficulty). Tab-separated.
    df = pd.read_csv(TEST_DATA_PATH, header=None, sep='\t')
    df = df.iloc[:, :41]
    df.columns = NSL_KDD_COLUMNS
    _test_records_cache = df.to_dict(orient='records')
    return _test_records_cache


def _stream_loop():
    records = _load_test_records()
    n = len(records)
    while True:
        with stream_lock:
            if not stream_state['running']:
                return
            interval = stream_state['interval']

        try:
            row = records[random.randint(0, n - 1)]
            results = run_prediction([row])
            r = results[0]
            with stream_lock:
                stream_state['session_total'] += 1
                if r['is_attack']:
                    stream_state['session_attacks'] += 1
                else:
                    stream_state['session_normal'] += 1
                stream_state['recent'].insert(0, {
                    'timestamp': datetime.now().strftime('%H:%M:%S'),
                    'prediction': r['prediction'],
                    'confidence': r['confidence'],
                    'is_attack': r['is_attack'],
                    'protocol': r['protocol'],
                    'service': r['service'],
                    'flag': r['flag'],
                    'description': r['description'],
                    'recommendation': r['recommendation'],
                })
                stream_state['recent'] = stream_state['recent'][:20]
        except Exception as e:
            print(f"[stream] prediction error: {e}")

        time.sleep(interval)


@app.route('/api/stream/start', methods=['POST'])
def stream_start():
    body = request.get_json(silent=True) or {}
    interval = float(body.get('interval', 2.0))
    interval = max(0.5, min(interval, 10.0))

    with stream_lock:
        if stream_state['running']:
            return jsonify({'status': 'already_running', 'interval': stream_state['interval']})

        try:
            _load_test_records()
        except FileNotFoundError as e:
            return jsonify({'error': str(e)}), 500

        stream_state['running'] = True
        stream_state['interval'] = interval
        stream_state['started_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        stream_state['session_total'] = 0
        stream_state['session_attacks'] = 0
        stream_state['session_normal'] = 0
        stream_state['recent'] = []

        t = threading.Thread(target=_stream_loop, daemon=True)
        stream_state['thread'] = t
        t.start()

    return jsonify({'status': 'started', 'interval': interval})


@app.route('/api/stream/stop', methods=['POST'])
def stream_stop():
    with stream_lock:
        was_running = stream_state['running']
        stream_state['running'] = False
    return jsonify({'status': 'stopped' if was_running else 'not_running'})


@app.route('/api/stream/status', methods=['GET'])
def stream_status():
    with stream_lock:
        total = stream_state['session_total']
        attacks = stream_state['session_attacks']
        return jsonify({
            'running': stream_state['running'],
            'started_at': stream_state['started_at'],
            'interval': stream_state['interval'],
            'total': total,
            'attacks': attacks,
            'normal': stream_state['session_normal'],
            'attack_rate': round((attacks / total * 100) if total > 0 else 0, 2),
            'recent': list(stream_state['recent']),
        })


if __name__ == '__main__':
    # use_reloader=False prevents the streamer thread from being duplicated/killed
    # when Flask's debug reloader restarts the process on file changes.
    app.run(debug=True, port=5000, use_reloader=False)
