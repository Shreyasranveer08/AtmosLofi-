import firebase_admin
from firebase_admin import credentials, auth
import os

def init_firebase_admin():
    """Initializes the Firebase Admin SDK."""
    try:
        # Check if already initialized
        firebase_admin.get_app()
    except ValueError:
        # For professional setup, we use JSON service account key.
        # If not present, we skip (logic will fail gracefully on protected routes)
        cred_path = os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json")
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin Initialized (Service Account)")
        else:
            # Fallback for simple verification if project-id is known
            try:
                firebase_admin.initialize_app()
                print("Firebase Admin Initialized (Default Environment)")
            except Exception as e:
                print(f"Warning: Firebase Admin not fully initialized: {e}")

def verify_token(id_token: str):
    """Verifies a Firebase ID token sent from the frontend."""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None
