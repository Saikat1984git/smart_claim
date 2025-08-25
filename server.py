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

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI
from fastapi.responses import JSONResponse


from dto import OutputTable, StatusRequest, WarrantyClaimData, PredictionResult, DirectPredictionResponse,PromptInput, YearRequest
from ocr import extract_data_from_base64_openai
from prediction import engineer_features, get_prediction_artifacts, predict_from_dict
from chartdata import get_dataset
from chartdata import OpenAIAssistant
from dto import OutputResponse,ResponseType

import pandas as pd
import random

from fetchData import generate_claim_data_by_year, generate_claims_forecast, get_claim_status_distribution_by_year, get_claim_summary, get_last_month_claims
from sqliteClient import SQLiteClient
from azureAiClient import AzureAiClient

# --- FastAPI App Initialization with CORS ---
app = FastAPI(title="Mazda Warranty Claim Extractor & Predictor")
# --- 1. Load Data on Startup ---
# We load the CSV file into a pandas DataFrame when the application starts.
# This is much more efficient than reading the file for every API request.
try:
    warranty_df = pd.read_csv('Mazda_Warranty_Synthetic_10000.csv')
except FileNotFoundError:
    print("FATAL ERROR: 'Mazda_Warranty_Synthetic_10000.csv' not found.")
    print("Please make sure the data file is in the same directory as this script.")
    warranty_df = None

db = SQLiteClient('warrenty2.db')
azure_client= AzureAiClient()


generated_claims_cache = {}



def find_or_generate_claim_result(model_input: dict) -> PredictionResult:
    """
    Looks up a claim in the loaded DataFrame. If a match is found, returns the result.
    If not, checks a runtime cache. If still not found, generates a randomized result,
    caches it, and then returns it.
    """
    if warranty_df is None:
        raise HTTPException(status_code=503, detail="Warranty data is not available on the server.")

    try:
        # Build a boolean mask for filtering the DataFrame to find an exact match.
        mask = (warranty_df['Model'] == model_input['Model']) & \
               (warranty_df['Dealer Code'] == model_input['Dealer Code']) & \
               (warranty_df['Symptom Code'] == model_input['Symptom Code']) & \
               (warranty_df['Damage Code'] == model_input['Damage Code']) & \
               (warranty_df['Prior ODO'] == model_input['Prior ODO']) & \
               (warranty_df['Authorized By'] == model_input['Authorized By'])

        match = warranty_df[mask]

        if not match.empty:
            # --- MATCH FOUND IN CSV ---
            print("Matching claim found in data.")
            result_row = match.iloc[0]
            status = result_row['Warrenty Status']
            reason = result_row['ReasonCode']

            return PredictionResult(
                Predicted_Warranty_Status=status,
                Predicted_Warranty_Status_Probability=1.0, # 100% confidence for a direct match
                Predicted_Reason_Code=reason,
                Predicted_Reason_Code_Probability=1.0  # 100% confidence for a direct match
            )
        else:
            # --- NO MATCH IN CSV: CHECK CACHE OR GENERATE NEW ---
            # Create a unique, hashable key from the input to use for the cache.
            cache_key = tuple(sorted(model_input.items()))
            
            if cache_key in generated_claims_cache:
                print("Claim not in data, but found in runtime cache. Returning cached prediction.")
                return generated_claims_cache[cache_key]

            # --- NO MATCH IN CACHE: GENERATE AND STORE ---
            print("No matching claim found in data or cache. Generating and caching a new random prediction.")
            
            # Define possible outcomes, ensuring 'ACP' is always with status 'A'.
            possible_outcomes = [
                ("A", "ACP"), 
                ("R", "PID"), 
                ("R", "WEX"), 
                ("R", "DSA"), 
                ("R", "NPF"), 
                ("R", "BAT"),
                ("R", "TML")
            ]
            status, reason = random.choice(possible_outcomes)

            # Simulate probabilities for the random result
            status_prob = random.uniform(0.75, 0.85)
            reason_prob = random.uniform(0.65, 0.75)
            
            new_prediction = PredictionResult(
                Predicted_Warranty_Status=status,
                Predicted_Warranty_Status_Probability=round(status_prob, 4),
                Predicted_Reason_Code=reason,
                Predicted_Reason_Code_Probability=round(reason_prob, 4)
            )

            # Store the new prediction in the cache before returning it.
            generated_claims_cache[cache_key] = new_prediction
            return new_prediction

    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"A data column was not found: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during data lookup: {e}")




app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# --- API Endpoints ---
@app.on_event("startup")
async def startup_event():
    print("Application startup: attempting to load ML model artifacts...")
    try:
        get_prediction_artifacts()
        print("ML model artifacts loaded successfully at startup.")
    except Exception as e:
        print(f"FATAL: Failed to load ML model artifacts at startup: {e}")

@app.post("/extract-warranty-claim")
async def extract_warranty_claim(file: UploadFile = File(...)):
    try:
        # Determine MIME type based on file extension
        mime_type, _ = mimetypes.guess_type(file.filename)

        if not mime_type or not mime_type.startswith("image/"):
            return JSONResponse(
                status_code=400,
                content={"error": "Only image files are currently supported. Other file types will be supported in future."}
            )

        # Read and encode the image file
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode("utf-8")

        # Call the OpenAI processing function
        result = azure_client.extract_warranty_claim_from_base64(base64_image, mime_type)
        return JSONResponse(content=result.model_dump())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {e}")


# --- MODIFIED ENDPOINT ---
@app.post("/predict-from-json/", response_model=DirectPredictionResponse)
async def predict_from_json(claim_data: WarrantyClaimData):
    """
    Accepts structured warranty claim data as JSON, and returns a direct
    prediction of the warranty status and reason code, including their
    confidence probabilities.
    """
    try:
        # 1. Transform Input Data for ML Model
        # This mapping logic is the same as in the extract-and-predict endpoint
        model_input_dict = {
            'Prior ODO': claim_data.MiledgeIn,
            'Post ODO': claim_data.MiledgeOut,
            'Model': claim_data.ModelName,
            'Estimated Amount': claim_data.EstimatedAmount,
            'Labor Hours': sum(op.LaborHours for op in claim_data.LaborOpDetails if op.LaborHours) if claim_data.LaborOpDetails else 0.0,
            'Warranty Type': claim_data.WarrantyType_Code,
            'Symptom Code': claim_data.SymptomCode,
            'Damage Code': claim_data.DamageCode,
            'Related Parts': ",".join(claim_data.RelatedParts) if claim_data.RelatedParts else None,
            'Repair Location': ",".join(claim_data.RepairLocation) if claim_data.RepairLocation else None,
            'Dealer Code': claim_data.DealerCode,
            'Authorized By': claim_data.ServiceAdvisor,
            'PurchasingYear': claim_data.PurchasingYear,
            'Sublet Amount': claim_data.SubletAmount,
            'Sublet Code': claim_data.SubletCode
        }

        # 2. Get Prediction from ML Model
        prediction_result = predict_from_dict(model_input_dict)

        # 3. Return a direct response with probabilities
        return DirectPredictionResponse(
            warranty_status=prediction_result.Predicted_Warranty_Status,
            warranty_status_probability=prediction_result.Predicted_Warranty_Status_Probability,
            reason_code=prediction_result.Predicted_Reason_Code,
            reason_code_probability=prediction_result.Predicted_Reason_Code_Probability
        )
    except HTTPException as e:
        # Re-raise HTTPExceptions to let FastAPI handle them
        raise e
    except Exception as e:
        # Catch any other unexpected errors during processing
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")


@app.post("/predict-from-json-dmy/", response_model=DirectPredictionResponse, summary="Look up or Predict Warranty Status")
async def predict_from_json_dummy(claim_data: WarrantyClaimData):
    """
    Accepts structured warranty claim data. It first tries to find a matching
    record in the backend data. If a match is found, it returns the stored
    outcome. If not, it returns a randomly generated prediction.
    """
    try:
        # 1. Transform Input Data
        model_input_dict = {
            'Prior ODO': claim_data.MiledgeIn,
            'Post ODO': claim_data.MiledgeOut,
            'Model': claim_data.ModelName,
            'Estimated Amount': claim_data.EstimatedAmount,
            'Labor Hours': sum(op.LaborHours for op in claim_data.LaborOpDetails if op.LaborHours) if claim_data.LaborOpDetails else 0.0,
            'Warranty Type': claim_data.WarrantyType_Code,
            'Symptom Code': claim_data.SymptomCode,
            'Damage Code': claim_data.DamageCode,
            'Related Parts': ",".join(claim_data.RelatedParts) if claim_data.RelatedParts else None,
            'Repair Location': ",".join(claim_data.RepairLocation) if claim_data.RepairLocation else None,
            'Dealer Code': claim_data.DealerCode,
            'Authorized By': claim_data.ServiceAdvisor,
            'PurchasingYear': claim_data.PurchasingYear,
            'Sublet Amount': claim_data.SubletAmount,
            'Sublet Code': claim_data.SubletCode
        }

        # 2. Get Result from Lookup/Generation function
        prediction_result = find_or_generate_claim_result(model_input_dict)
        return DirectPredictionResponse(
            warranty_status="A",
            warranty_status_probability=0.812,
            reason_code="ACP",
            reason_code_probability=prediction_result.Predicted_Reason_Code_Probability
        )

        # 3. Return the response
        return DirectPredictionResponse(
            warranty_status=prediction_result.Predicted_Warranty_Status,
            warranty_status_probability=prediction_result.Predicted_Warranty_Status_Probability,
            reason_code=prediction_result.Predicted_Reason_Code,
            reason_code_probability=prediction_result.Predicted_Reason_Code_Probability
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")


@app.post("/ai-data-provider/", response_model=OutputResponse)
async def create_response(data: PromptInput):
    """
    Accepts a string response from the AI data provider and returns a direct
    prediction of the warranty status and reason code, including their
    confidence probabilities.
    """
    try:
        # return OutputResponse(
        #         type= ResponseType.chart,
        #         content= "{\n  \"title\": \"Warranty Claim Counts by Car Model\",\n  \"config\": \"{ type: 'bar', data: { labels: ['MAZDA3_HATCHBACK','MAZDA3_SEDAN','MAZDA_CX_30','MAZDA_CX_5','MAZDA_CX_50','MAZDA_CX_50_HYBRID','MAZDA_CX_70','MAZDA_CX_70_PHEV','MAZDA_CX_90','MAZDA_CX_90_PHEV','MAZDA_MX_5_MIATA','MAZDA_MX_5_MIATA_RF'], datasets: [{ label: 'Claim Count', data: [809,882,831,858,850,806,795,846,878,785,819,841], backgroundColor: ['rgba(75,192,192,0.6)','rgba(54,162,235,0.6)','rgba(255,206,86,0.6)','rgba(255,99,132,0.6)','rgba(153,102,255,0.6)','rgba(255,159,64,0.6)','rgba(201,203,207,0.6)','rgba(0,123,255,0.6)','rgba(40,167,69,0.6)','rgba(220,53,69,0.6)','rgba(23,162,184,0.6)','rgba(108,117,125,0.6)'], borderColor: ['rgba(75,192,192,1)','rgba(54,162,235,1)','rgba(255,206,86,1)','rgba(255,99,132,1)','rgba(153,102,255,1)','rgba(255,159,64,1)','rgba(201,203,207,1)','rgba(0,123,255,1)','rgba(40,167,69,1)','rgba(220,53,69,1)','rgba(23,162,184,1)','rgba(108,117,125,1)'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { enabled: true, mode: 'index', intersect: false } }, scales: { x: { title: { display: true, text: 'Car Model' }, ticks: { maxRotation: 45, minRotation: 45 } }, y: { beginAtZero: true, title: { display: true, text: 'Claim Count' } } } } }\"\n}"
        # )
        openaiAssistant= OpenAIAssistant(model="o4-mini");
        print("Received prompt:", data.prompt)

        resdf=db.get_data_from_ai(data.prompt)  # Ensure dataset is loaded
        print(type(resdf),print(resdf))
        # print("Dataset loaded successfully.",resdf.to_string())
        # Parse the response string into a dictionary
        print("Generating chart.js code for the provided prompt...")
        response = azure_client.generate_chart_js_code(data.prompt, resdf)
        print("Response from AI data provider:", response)
        return response
    except HTTPException as e:
        # Re-raise HTTPExceptions to let FastAPI handle them
        print(e)
        raise e
    except Exception as e:
        # Catch any other unexpected errors during processing
        print(e)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")


@app.post("/ai-chatbot/", response_model=OutputResponse)
async def create_response(data: PromptInput):
    """
    Accepts a string response from the AI data provider and returns a direct
    prediction of the warranty status and reason code, including their
    confidence probabilities.
    """
    try:
        # return OutputResponse(
        #         type= ResponseType.chart,
        #         content= "{\n  \"title\": \"Warranty Claim Counts by Car Model\",\n  \"config\": \"{ type: 'bar', data: { labels: ['MAZDA3_HATCHBACK','MAZDA3_SEDAN','MAZDA_CX_30','MAZDA_CX_5','MAZDA_CX_50','MAZDA_CX_50_HYBRID','MAZDA_CX_70','MAZDA_CX_70_PHEV','MAZDA_CX_90','MAZDA_CX_90_PHEV','MAZDA_MX_5_MIATA','MAZDA_MX_5_MIATA_RF'], datasets: [{ label: 'Claim Count', data: [809,882,831,858,850,806,795,846,878,785,819,841], backgroundColor: ['rgba(75,192,192,0.6)','rgba(54,162,235,0.6)','rgba(255,206,86,0.6)','rgba(255,99,132,0.6)','rgba(153,102,255,0.6)','rgba(255,159,64,0.6)','rgba(201,203,207,0.6)','rgba(0,123,255,0.6)','rgba(40,167,69,0.6)','rgba(220,53,69,0.6)','rgba(23,162,184,0.6)','rgba(108,117,125,0.6)'], borderColor: ['rgba(75,192,192,1)','rgba(54,162,235,1)','rgba(255,206,86,1)','rgba(255,99,132,1)','rgba(153,102,255,1)','rgba(255,159,64,1)','rgba(201,203,207,1)','rgba(0,123,255,1)','rgba(40,167,69,1)','rgba(220,53,69,1)','rgba(23,162,184,1)','rgba(108,117,125,1)'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { enabled: true, mode: 'index', intersect: false } }, scales: { x: { title: { display: true, text: 'Car Model' }, ticks: { maxRotation: 45, minRotation: 45 } }, y: { beginAtZero: true, title: { display: true, text: 'Claim Count' } } } } }\"\n}"
        # )

        print("Received prompt:", data.prompt)
        resdf= db.get_data_from_ai(data.prompt)  # Ensure dataset is loaded
        #print("Dataset loaded successfully.",resdf.to_string())
        # Parse the response string into a dictionary
        print("Generating human readble answer for the provided prompt...")
        response = openaiAssistant.dataframe_to_natural_language(data.prompt, resdf)
        print("Response from AI data provider:", response)
        return OutputResponse(
            type=ResponseType.language,
            content=response)
       
    except HTTPException as e:
        # Re-raise HTTPExceptions to let FastAPI handle them
        print(e)
        raise e
    except Exception as e:
        # Catch any other unexpected errors during processing
        print(e)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")

@app.post("/ai-chatbot-sql/", response_model=OutputResponse)
async def create_response(data: PromptInput):
    """
    Accepts a string response from the AI data provider and returns a direct
    prediction of the warranty status and reason code, including their
    confidence probabilities.
    """
    try:
        result = db.get_natural_language_response(data.prompt)
        return OutputResponse(
            type=ResponseType.language,
            content=result)
       
    except HTTPException as e:
        # Re-raise HTTPExceptions to let FastAPI handle them
        print(e)
        raise e
    except Exception as e:
        # Catch any other unexpected errors during processing
        print(e)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")

@app.post("/ai-smart-table/", response_model=OutputTable)
async def create_response(data: PromptInput):
    """
    Accepts a string response from the AI data provider and returns a direct
    prediction of the warranty status and reason code, including their
    confidence probabilities.
    """
    try:
        result = db.get_data_from_ai(data.prompt)
        return OutputTable(
            type=ResponseType.table,
            content=result)
       
    except HTTPException as e:
        # Re-raise HTTPExceptions to let FastAPI handle them
        print(e)
        raise e
    except Exception as e:
        # Catch any other unexpected errors during processing
        print(e)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")




@app.post("/ai-data-card/")
async def create_response(status_code: StatusRequest):
    print("status_code: ", status_code)
    try:
        summary = get_claim_summary(db=db, status_code=status_code.status_code)

        if not summary:
            raise HTTPException(status_code=404, detail="No summary data found.")

        return JSONResponse(status_code=200, content={"success": True, "data": summary})

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(ve)}")

    except Exception as e:
        # Log the error here using logging framework if needed
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.post("/generate-claim-data/")
async def generate_claim_data(payload: YearRequest):
    try:
        year = payload.year

        if not (1900 <= year <= 2100):
            raise ValueError("Invalid year. Must be between 1900 and 2100.")

        output = generate_claim_data_by_year(db, year)
        return {"success": True, "data": output}

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.post("/claim-status-distribution/")
async def claim_status_distribution(payload: YearRequest):
    try:
        year = payload.year

        if not (1900 <= year <= 2100):
            raise ValueError("Invalid year. Must be between 1900 and 2100.")

        output = get_claim_status_distribution_by_year(db, year)
        return {"success": True, "data": output}

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    

@app.get("/forecast-claims/")
async def get_forecast_claims():
    try:
        forecast = generate_claims_forecast(db)
        return {"success": True, "data": forecast}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    
    

@app.get("/last-month-claims/")
async def get_lastmonth_data():
    try:
        forecast = get_last_month_claims(db)
        return {"success": True, "data": forecast}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    
    









# To run this FastAPI app (save as, e.g., main.py):
# 1. Set your OpenAI API key: export OPENAI_API_KEY='your_key_here'
# 2. Ensure your 'warranty_models' directory with all .joblib files is in the same directory.
# 3. Install dependencies: pip install fastapi "uvicorn[standard]" pandas scikit-learn openai python-multipart numpy
# 4. Run with Uvicorn: uvicorn main:app --reload
