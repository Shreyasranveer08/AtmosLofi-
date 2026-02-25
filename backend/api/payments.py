import os
import hmac
import hashlib
import razorpay
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from firebase_admin import firestore

router = APIRouter()

# Initialize Razorpay Client
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_mocked_id")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "rzp_test_mocked_secret")

try:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
except Exception as e:
    print(f"Failed to initialize Razorpay: {e}")
    razorpay_client = None

# We offer token packs. 20 songs = 99 INR, 50 songs = 199 INR
PACKS = {
    "pack_20": {"amount": 9900, "credits": 20, "name": "20 Songs Pack"},
    "pack_50": {"amount": 19900, "credits": 50, "name": "50 Songs Pack"}
}

class OrderRequest(BaseModel):
    pack_id: str
    user_id: str

class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    pack_id: str
    user_id: str

@router.post("/create-order")
async def create_order(request: OrderRequest):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
        
    pack = PACKS.get(request.pack_id)
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid pack selected")

    try:
        import uuid
        short_id = str(uuid.uuid4())[:8]
        order_data = {
            "amount": pack["amount"],
            "currency": "INR",
            "receipt": f"rcpt_{short_id}",
            "notes": {
                "user_id": request.user_id,
                "pack": request.pack_id
            }
        }
        order = razorpay_client.order.create(data=order_data)
        return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"], "key_id": RAZORPAY_KEY_ID}
    except Exception as e:
        print(f"Razorpay Order Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify")
async def verify_payment(request: VerifyRequest):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
        
    try:
        # Verify Signature
        params_dict = {
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # If successful, add credits to Firebase
        pack = PACKS.get(request.pack_id)
        if not pack:
            raise HTTPException(status_code=400, detail="Invalid pack")
            
        try:
            db = firestore.client()
            user_ref = db.collection('users').document(request.user_id)
            user_doc = user_ref.get()
            
            current_credits = 0
            if user_doc.exists:
                current_credits = user_doc.to_dict().get('credits', 0)
                
            new_credits = current_credits + pack["credits"]
            
            user_ref.set({
                'credits': new_credits,
                'isPro': True # Any credit means they have premium features for those songs
            }, merge=True)
            
            return {"status": "success", "message": "Payment verified and credits added", "new_credits": new_credits}
        except Exception as db_err:
            print(f"Database Error distributing credits: {db_err}")
            raise HTTPException(status_code=500, detail="Payment verified but failed to add credits. Please contact support.")

    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Payment Signature")
    except Exception as e:
        print(f"Verification Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
