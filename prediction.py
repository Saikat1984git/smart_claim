from fastapi import HTTPException
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
import joblib
import os
import datetime
from typing import List, Optional, Dict, Any
import base64
import mimetypes

from dto import PredictionResult


# --- Configuration for ML Model Artifacts ---
MODEL_DIR = "warranty_models"
PREPROCESSOR_FILE = os.path.join(MODEL_DIR, "column_transformer.joblib")
STATUS_MODEL_FILE = os.path.join(MODEL_DIR, "warranty_status_model.joblib")
REASON_MODEL_FILE = os.path.join(MODEL_DIR, "reason_code_model.joblib")
STATUS_ENCODER_FILE = os.path.join(MODEL_DIR, "status_label_encoder.joblib")
REASON_ENCODER_FILE = os.path.join(MODEL_DIR, "reason_label_encoder.joblib")
FEATURE_NAMES_FILE = os.path.join(MODEL_DIR, "feature_names.joblib")

# --- ML Model Helper Functions ---
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df_engineered = df.copy()
    if 'PurchasingYear' in df_engineered.columns:
        try:
            purchase_year_numeric = pd.to_numeric(df_engineered['PurchasingYear'], errors='coerce')
            valid_year_mask = purchase_year_numeric.notna()
            if valid_year_mask.any():
                current_year = datetime.datetime.now().year
                df_engineered.loc[valid_year_mask, 'Vehicle_Age_Years'] = current_year - purchase_year_numeric[valid_year_mask]
        except Exception as e:
            print(f"Could not engineer 'Vehicle_Age_Years': {e}")
    if 'Vehicle_Age_Years' not in df_engineered.columns:
        df_engineered['Vehicle_Age_Years'] = np.nan
    return df_engineered

def load_artifacts():
    required_files = [PREPROCESSOR_FILE, STATUS_MODEL_FILE, REASON_MODEL_FILE, STATUS_ENCODER_FILE, REASON_ENCODER_FILE, FEATURE_NAMES_FILE]
    if not all(os.path.exists(f) for f in required_files):
        missing = [f for f in required_files if not os.path.exists(f)]
        raise FileNotFoundError(f"Missing model artifacts: {missing}")
    try:
        artifacts = {
            "preprocessor": joblib.load(PREPROCESSOR_FILE),
            "status_model": joblib.load(STATUS_MODEL_FILE),
            "reason_model": joblib.load(REASON_MODEL_FILE),
            "status_encoder": joblib.load(STATUS_ENCODER_FILE),
            "reason_encoder": joblib.load(REASON_ENCODER_FILE),
            "feature_names": joblib.load(FEATURE_NAMES_FILE)
        }
        return artifacts
    except Exception as e:
        raise IOError(f"Error loading artifacts: {e}")

prediction_artifacts = None

def get_prediction_artifacts():
    global prediction_artifacts
    if prediction_artifacts is None:
        prediction_artifacts = load_artifacts()
    return prediction_artifacts

# MODIFIED function to get prediction probabilities
def predict_from_dict(model_input_dict: Dict[str, Any]) -> PredictionResult:
    try:
        artifacts = get_prediction_artifacts()
        feature_names = artifacts['feature_names']
        all_trained_features = feature_names['numerical'] + feature_names['categorical']
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service Unavailable: Could not load ML models. {e}")

    transformed_df = pd.DataFrame([model_input_dict])
    X_prepared = pd.DataFrame(columns=all_trained_features)
    for col in all_trained_features:
        if col in transformed_df.columns:
            X_prepared[col] = transformed_df[col]
        else:
            X_prepared[col] = np.nan

    X_prepared = engineer_features(X_prepared.copy())
    X_to_transform = X_prepared[all_trained_features]

    try:
        X_processed = artifacts['preprocessor'].transform(X_to_transform)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error preprocessing data for model: {e}")

    # --- Status Prediction with Probability ---
    status_pred_encoded = artifacts['status_model'].predict(X_processed)
    status_probas = artifacts['status_model'].predict_proba(X_processed)
    status_confidence = np.max(status_probas, axis=1)[0]
    status_pred_decoded = artifacts['status_encoder'].inverse_transform(status_pred_encoded)

    # --- Reason Code Prediction with Probability ---
    reason_pred_encoded = artifacts['reason_model'].predict(X_processed)
    reason_probas = artifacts['reason_model'].predict_proba(X_processed)
    reason_confidence = np.max(reason_probas, axis=1)[0]
    reason_pred_decoded = artifacts['reason_encoder'].inverse_transform(reason_pred_encoded)

    return PredictionResult(
        Predicted_Warranty_Status=status_pred_decoded[0],
        Predicted_Warranty_Status_Probability=float(status_confidence),
        Predicted_Reason_Code=reason_pred_decoded[0],
        Predicted_Reason_Code_Probability=float(reason_confidence)
    )
