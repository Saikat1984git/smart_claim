import os
from typing import Optional, Any, Dict
from openai import AzureOpenAI
from dotenv import load_dotenv
import pandas as pd
import tiktoken
from dto import ChartInput, WarrantyClaimData
from dto import OutputResponse,ResponseType


# Import your Pydantic model from your codebase
# from your_package.models import WarrantyClaimData
# For type hints only (optional), uncomment the import above or replace with your path.


class AzureAiClient:
    def __init__(self):
        # Load environment variables
        load_dotenv()

        # Configuration from .env
        self.endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.model_name = os.getenv("MODEL_NAME")       # optional / informational
        self.deployment = os.getenv("DEPLOYMENT")       # Azure deployment ID (must support vision + tools, e.g., gpt-4o)
        self.subscription_key = os.getenv("AZURE_OPENAI_KEY")
        self.api_version = os.getenv("API_VERSION")

        # Initialize Azure OpenAI client
        self.client = AzureOpenAI(
            api_version=self.api_version,
            azure_endpoint=self.endpoint,
            api_key=self.subscription_key,
        )

    # ---------- Utility ----------
    @staticmethod
    def estimate_token_count(prompt: str) -> int:
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(prompt))

    # ---------- Simple helpers ----------
    def get_gpt_response(self, prompt: str) -> Optional[str]:
        """(Keeps your old dynamic-max_tokens example)"""
        try:
            input_token_count = self.estimate_token_count(prompt)
            max_tokens = input_token_count + 100
            print(f"User input token count: {input_token_count}")
            print(f"Max Token Value: {max_tokens}")

            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=1.0,
                top_p=1.0,
                model=self.deployment,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error: {e}")
            return None

    def send_system_and_user_message(self,messeges, model="gpt-4o-mini",temperature=0.3) -> Optional[str]:
        """Send system + user together (no max_tokens)."""
        try:
            response = self.client.chat.completions.create(
                messages= messeges,
                model=model
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error: {e}")
            return None

    # ---------- NEW: Warranty claim extractor (Vision + Function Tool) ----------
    def extract_warranty_claim_from_base64(
        self,
        base64_image_data: str,
        mime_type: str,
    ) -> WarrantyClaimData:
        """
        Uses Azure OpenAI (vision + function calling) to extract structured warranty claim data
        and validate into your Pydantic model `WarrantyClaimData`.

        Returns:
            WarrantyClaimData instance on success.
            Raises Exception on failure.
        """
        system_prompt = (
            "You are an expert AI assistant specializing in extracting structured information "
            "from vehicle warranty claim documents. Strictly extract data that conforms to the "
            "WarrantyClaimData model, including the vehicle's PurchasingYear if available. "
            "Do not hallucinate or infer missing data. If a field is not present, omit it."
        )

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
            response = self.client.chat.completions.create(
                model="gpt-4o",   # your Azure deployment (e.g., gpt-4o)
                messages=messages,
                tools=[{
                    "type": "function",
                    "function": {
                        "name": "claim_data_extractor",
                        "parameters": WarrantyClaimData.model_json_schema(),
                    },
                }],
                tool_choice={"type": "function", "function": {"name": "claim_data_extractor"}},
            )

            # Access the tool call arguments (JSON string)
            tool_calls = response.choices[0].message.tool_calls
            if not tool_calls or not tool_calls[0].function or not tool_calls[0].function.arguments:
                raise ValueError("No function tool call with arguments found in the response.")

            args_json = tool_calls[0].function.arguments
            # Validate with your Pydantic model
            extracted = WarrantyClaimData.model_validate_json(args_json)
            return extracted

        except Exception as e:
            # Bubble up so your FastAPI handler can map to HTTPException if needed
            raise RuntimeError(f"Azure OpenAI extraction error: {e}") from e


    def generate_chart_js_code(
        self,
        prompt: str,
        data
    ) -> object:
        """
        Generate Chart.js config/code from a DataFrame using Azure OpenAI.
        Forces structured JSON via function-calling that matches ChartInput schema.
        Returns an OutputResponse with type=ResponseType.chart on success.
        """

        # Convert DataFrame to a compact, readable string for LLM context
        df_str = '\n'.join(data)

        system_msg = (
            "You are a JavaScript Chart.js expert. Read the user prompt and generate Chart.js code. "
            "If the user specifies a chart type, use it; otherwise, choose the most suitable chart based on the data. "
            "Return your response strictly as a JSON object matching the ChartInput schema. "
            "Create a professional, interactive Chart.js chart using a modern and visually distinct color scheme. "
            "Ensure it is responsive, easy to interpret, and includes useful features like legends, tooltips, and hover effects. "
            "The chart should be polished and presentation-ready."
        )

        messages = [
            {"role": "system", "content": system_msg},
            {
                "role": "user",
                "content": f"User prompt: {prompt}\n\nHere is the data:\n{df_str}\n",
            },
        ]

        try:
            # Use function-calling to enforce the ChartInput JSON shape

            print(ChartInput.model_json_schema())
            response = self.client.chat.completions.create(
                model=self.deployment,  # your Azure deployment (e.g., gpt-4o or gpt-4o-mini)
                messages=messages,
                tools=[
                    {
                        "type": "function",
                        "function": {
                            "name": "chart_input_builder",
                            "description": "Return a JSON object matching the ChartInput schema for Chart.js rendering.",
                            "parameters": ChartInput.model_json_schema(),
                        },
                    }
                ],
                tool_choice={"type": "function", "function": {"name": "chart_input_builder"}}
            )

            choice = response.choices[0].message

            # Primary path: tool call with JSON arguments
            if getattr(choice, "tool_calls", None):
                args_json = choice.tool_calls[0].function.arguments
                chart_obj = ChartInput.model_validate_json(args_json)
            else:
                # Fallback path: try to parse message content as JSON (in case model didn't do tool-calling)
                content = (choice.content or "").strip()
                if not content:
                    raise ValueError("Empty response content and no tool_calls present.")
                try:
                    chart_obj = ChartInput.model_validate_json(content)
                except Exception:
                    # If content isn't raw JSON, try to extract a JSON block
                    start = content.find("{")
                    end = content.rfind("}")
                    if start == -1 or end == -1 or end < start:
                        raise ValueError("No JSON object found in response content.")
                    snippet = content[start : end + 1]
                    chart_obj = ChartInput.model_validate_json(snippet)

            # If your OutputResponse expects a string, convert the Pydantic model
            generated_code = chart_obj.to_string() if hasattr(chart_obj, "to_string") else chart_obj.model_dump_json()

            # Print (optional debug)
            print("Generated Chart.js code:", generated_code)

            return OutputResponse(
                type=ResponseType.chart,
                content=generated_code,
            )

        except Exception as e:
            print(f"Error generating Chart.js code: {e}")
            # Safe fallback: return a message (you can embed a minimal Chart.js config if desired)
            return OutputResponse(
                type=ResponseType.language,
                content="Failed to generate chart configuration. Please refine the prompt or try again.",
            )




if __name__ == "__main__":
    client = AzureAiClient()

    # Build a simple system+user conversation
    test_messages = [
        {"role": "system", "content": "You are a concise assistant. Reply in at most 3 bullet points."},
        {"role": "user", "content": "Explain what FastAPI is and why it’s popular."}
    ]

    # Call the method — by default it will use your DEPLOYMENT from .env
    #result = client.send_system_and_user_message(test_messages)

    result= client.get_gpt_response("Explain what FastAPI is and why it’s popular.")

    print("\n=== send_system_and_user_message result ===")
    print(result if result is not None else "[No response]")


