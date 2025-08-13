# --- OpenAI Data Extraction Function ---
from fastapi import HTTPException
from openai import OpenAI

from dto import WarrantyClaimData


def extract_data_from_base64_openai(base64_image_data: str, mime_type: str) -> WarrantyClaimData:
    try:
        client = OpenAI() # Assumes OPENAI_API_KEY is set in environment
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI client error: {e}")

    system_prompt = """
    You are an expert AI assistant specializing in extracting structured information from vehicle warranty claim documents.
    Strictly extract data that conforms to the WarrantyClaimData model, including the vehicle's PurchasingYear if available.
    Do not hallucinate or infer missing data. If a field is not present, omit it.
    """.strip()

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Extract all warranty claim data from the attached image into the provided tool's schema."},
                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{base64_image_data}"}}
            ]
        }
    ]

    try:
        # Note: The original code used a `client.responses.parse` method which might be specific to an older/custom library version.
        # The standard approach with the official OpenAI Python library v1+ is to use tools for structured output.
        response = client.chat.completions.create(
            model="gpt-4o", # Using a powerful model for better accuracy
            messages=messages,
            tools=[{"type": "function", "function": {"name": "claim_data_extractor", "parameters": WarrantyClaimData.model_json_schema()}}],
            tool_choice={"type": "function", "function": {"name": "claim_data_extractor"}}
        )
        tool_call_args = response.choices[0].message.tool_calls[0].function.arguments
        # The arguments are a JSON string, so we parse it into our Pydantic model
        extracted_data = WarrantyClaimData.model_validate_json(tool_call_args)
        return extracted_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"OpenAI extraction error: {e}")

