from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import json

# --- Pydantic Models ---



# Pydantic Models for OpenAI Structured Output
class LaborOpDetail(BaseModel):
    """Defines the structure for a single labor operation detail."""
    LaborOpCode: Optional[str] = Field(None, description="The code for the labor operation.")
    LaborHours: Optional[float] = Field(None, description="Hours claimed for this labor operation.")
    TechnicianID: Optional[str] = Field(None, description="Identifier for the technician who performed the work.")

class PartDetail(BaseModel):
    """Defines the structure for a single part detail."""
    part_name: Optional[str] = Field(None, description="Name or description of the part.")
    part_quantity: Optional[int] = Field(None, description="Quantity of the part used.")
    part_price: Optional[float] = Field(None, description="Price per unit of the part or total price for the quantity.")

class WarrantyClaimData(BaseModel):
    """Defines the overall structure for data extracted by OpenAI."""
    ClaimNumber: Optional[str] = Field(None, description="The main claim identification number.")
    VIN: Optional[str] = Field(None, description="Vehicle Identification Number (17 characters).")
    PurchasingYear: Optional[int] = Field(None, description="The year the vehicle was purchased. Crucial for calculating vehicle age.")
    RepairDate: Optional[str] = Field(None, description="Date the repair was performed (e.g., YYYY-MM-DD).")
    MiledgeIn: Optional[int] = Field(None, description="Odometer reading at the time of repair.")
    MiledgeOut: Optional[int] = Field(None, description="Odometer reading after the repair.")
    CustomerName: Optional[str] = Field(None, description="Name of the customer or vehicle owner.")
    RO_number: Optional[str] = Field(None, description="Repair Order number.")
    RO_Description: Optional[str] = Field(None, description="Description of the repair order.")
    PNMC: Optional[str] = Field(None, description="Part Number Main Cause.")
    PNMC_Quantity: Optional[int] = Field(None, description="Quantity of the Part Number Main Cause.")
    WarrantyType_Code: Optional[str] = Field(None, description="Code for the warranty type.")
    SymptomCode: Optional[str] = Field(None, description="Code for the reported symptom.")
    DamageCode: Optional[str] = Field(None, description="Code for the diagnosed damage.")
    RelatedParts: Optional[List[str]] = Field(default_factory=list, description="List of related part codes.")
    RepairLocation: Optional[List[str]] = Field(default_factory=list, description="List of repair locations.")
    ModelName: Optional[str] = Field(None, description="The model name of the vehicle.")
    PartsUsed: Optional[List[PartDetail]] = Field(default_factory=list, description="List of parts used.")
    LaborOpDetails: Optional[List[LaborOpDetail]] = Field(default_factory=list, description="List of labor operations.")
    ServiceAdvisor: Optional[str] = Field(None, description="Name or identifier of the service advisor.")
    DealerCode: Optional[str] = Field(None, description="The code identifying the dealership.")
    DealerName: Optional[str] = Field(None, description="Name of the dealership.")
    DealerAddress: Optional[str] = Field(None, description="Address of the dealership.")
    EstimatedAmount: Optional[float] = Field(None, description="Total estimated cost of the claim.")
    RepairNotes: Optional[str] = Field(None, description="Textual notes about the repair.")
    RO_open_date: Optional[str] = Field(None, description="Date the repair order was opened.")
    SubletAmount: Optional[float] = Field(0.0, description="Cost of any sublet repairs.")
    SubletCode: Optional[str] = Field(None, description="Code for any sublet repairs.")

# MODIFIED Pydantic Models for Final API Response to include probability
class PredictionResult(BaseModel):
    Predicted_Warranty_Status: str
    Predicted_Warranty_Status_Probability: float
    Predicted_Reason_Code: str
    Predicted_Reason_Code_Probability: float

class FullPredictionResponse(BaseModel):
    extracted_data: WarrantyClaimData
    prediction_result: PredictionResult
    errors: Optional[str] = None

# MODIFIED Pydantic model for the direct prediction endpoint response to include probability
class DirectPredictionResponse(BaseModel):
    warranty_status: str
    warranty_status_probability: float
    reason_code: str
    reason_code_probability: float


class PromptInput(BaseModel):
    prompt: str


class ChartInput(BaseModel):
    title:str = Field(
        ...,
        description="A human-readable title for the chart (e.g., 'Monthly Sales Overview' or 'User Growth Trends')."
    )
    config:str=Field(
        ...,
        description="""The complete Chart.js configuration, including type, dataste, and optionsetc .
        This should be a JSON string that matches the Chart.js schema exactly.
        Example 1:
        {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Sales ($k)',
                    data: [12, 19, 3, 5, 6, 3],
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        }

        example 2:
        {
            type: 'radar',
            data: {
                labels: ['Ease of Use', 'Speed', 'Features', 'Support', 'Reliability'],
                datasets: [{
                    label: 'Product A',
                    data: [4, 5, 3, 4, 5],
                    fill: true,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgb(255, 99, 132)',
                    pointBackgroundColor: 'rgb(255, 99, 132)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(255, 99, 132)'
                }, {
                    label: 'Product B',
                    data: [3, 4, 5, 3, 4],
                    fill: true,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgb(54, 162, 235)',
                    pointBackgroundColor: 'rgb(54, 162, 235)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(54, 162, 235)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        }

    """
    )
    def to_string(self) -> str:
        """
        Serialize this ChartInput instance to a formatted JSON string
        matching the schema exactly, with indentation for readability.
        """
        return json.dumps(self.model_dump(), indent=2)




class ResponseType(str, Enum):
    language = "language"
    chart = "chart"
    table = "table"

class OutputResponse(BaseModel):
    type: ResponseType = Field(
        ...,
        description="The type of response: 'language' for natural language, 'chart' for Chart.js code, or 'table' for tabular output."
    )
    content: str = Field(
        ...,
        description="The content of the response, format depends on the selected type."
    )

class OutputTable(BaseModel):
    type: ResponseType = Field(
        ...,
        description="The type of response: 'language' for natural language, 'chart' for Chart.js code, or 'table' for tabular output."
    )
    content: list[dict] = Field(
        ...,
        description="The content of the response, format depends on the selected type."
    )




class StatusRequest(BaseModel):
    status_code: str

class YearRequest(BaseModel):
    year: int