from dto import ChartInput;
import os
import json
import pandas as pd
from openai import OpenAI
from dto import OutputResponse,ResponseType

# Initialize the OpenAI client
# The client automatically looks for the OPENAI_API_KEY environment variable.
try:
    client = OpenAI()
except Exception as e:
    print(f"Error initializing OpenAI client: {e}")
    print("Please make sure you have set the OPENAI_API_KEY environment variable.")
    exit()

def get_relevant_data(user_prompt: str, df: pd.DataFrame, schema: dict) -> pd.DataFrame:
    """
    Generates and executes pandas code to extract data from a DataFrame based on a user prompt.

    Args:
        user_prompt (str): The user's question about the data.
        df (pd.DataFrame): The pandas DataFrame containing the data.
        schema (dict): A dictionary representing the data schema.

    Returns:
        pd.DataFrame: A DataFrame containing the data relevant to the user's prompt.
                       Returns an empty DataFrame if an error occurs.
    """
    # Get a string representation of the DataFrame's head for context
    df_head_str = df.head().to_string()
    schema_str = json.dumps(schema, indent=2)

    # Construct the prompt for the OpenAI API
    system_prompt = """
    You are an expert Python programmer specializing in pandas.
    Your task is to generate pandas code to answer a user's question about a given dataset.
    You will be provided with the data's schema, a sample of the data (the first 5 rows), and a user's question.

    Instructions:
    1.  Analyze the user's question, the schema, and the data sample.
    2.  Write Python code using the pandas library to extract the relevant information.
    3.  The DataFrame is already loaded and available in a variable named 'df'.
    4.  Your code should result in a new DataFrame named 'result_df' that contains the answer to the question.
    5.  Do NOT include any code to load the data (e.g., pd.read_csv).
    6.  Only output the Python code itself, without any explanations, comments, or markdown formatting.
    7.  Do not plot or show the data, just return the DataFrame.
    """

    full_user_prompt = f"""
    Here is the data schema:
    ```json
    {schema_str}
    ```

    Here is a sample of the data from the DataFrame 'df':
    ```
    {df_head_str}
    ```

    User Question: "{user_prompt}"

    Now, please generate the pandas code to create the 'result_df'.
    """

    print("Sending request to OpenAI API...")
    try:
        response = client.chat.completions.create(
            model="o4-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_user_prompt}
            ],
           
        )

        # Extract the generated code from the response
        generated_code = response.choices[0].message.content.strip()
        
        # Sometimes the model might still wrap the code in markdown
        if generated_code.startswith("```python"):
            generated_code = generated_code[9:]
        if generated_code.endswith("```"):
            generated_code = generated_code[:-3]
        
        print("\n--- Generated Pandas Code ---")
        print(generated_code)
        print("-----------------------------\n")

        # Prepare a local namespace for exec to run in.
        # This is safer than using exec on the global namespace.
        local_namespace = {'df': df, 'pd': pd}

        # Execute the generated code
        print("Executing generated code...")
        exec(generated_code, globals(), local_namespace)

        # The result is expected to be in 'result_df' in the local_namespace
        result_df = local_namespace.get('result_df', pd.DataFrame())

        if not isinstance(result_df, pd.DataFrame):
             print("Warning: The generated code did not produce a pandas DataFrame named 'result_df'.")
             return pd.DataFrame()


        return result_df

    except Exception as e:
        print(f"An error occurred: {e}")
        return pd.DataFrame() # Return an empty DataFrame on error
    



def get_dataset(userPrompt: str) -> pd.DataFrame:
    """
    Wrapper function to get the dataset based on user prompt.
    """
    csv_file_path = './Mazda_Warranty_Synthetic_10000.csv'
    schema_file_path = './schema.json'

    # --- Step 1: Load the data and schema ---
    try:
        print(f"Loading data from {csv_file_path}...")
        main_df = pd.read_csv(csv_file_path)
        print("Data loaded successfully.")

        print(f"Loading schema from {schema_file_path}...")
        with open(schema_file_path, 'r') as f:
            data_schema = json.load(f)
        print("Schema loaded successfully.\n")

    except FileNotFoundError as e:
        print(f"Error: {e}. Please make sure the files are in the correct directory.")
        exit()

    relevant_data_df = get_relevant_data(userPrompt, main_df, data_schema)

    # --- Step 3: Display the results ---
    if not relevant_data_df.empty:
        return relevant_data_df
    else:
        data = {'output': "No data retrieved"}
        return pd.DataFrame(data)


class OpenAIAssistant:

    def __init__(self, model="o4-mini"):
        self.model = model
        self.client = OpenAI()

    def _df_to_string(self, df: pd.DataFrame) -> str:
        return df.to_csv(index=False)

    # ----------- Function 1: Chart.js Generator -----------
    def generate_chart_js_code(self, prompt: str, df:pd.DataFrame) -> ChartInput:
        df_str = df.to_string(index=False)
        # print(df_str)
        # Use ChartInput.schema() for schema reference
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a JavaScript Chart.js expert. Read the user prompt and generate Chart.js code. "
                    "If the user specifies a chart type, use it; otherwise, choose the most suitable chart based on the data. "
                    "Return your response strictly as a JSON object matching the ChartInput schema."
                    "Create a professional, interactive Chart.js chart using a modern and visually distinct color scheme. Ensure it is responsive, easy to interpret, and includes useful features like legends, tooltips, and hover effects. The chart should be polished and presentation-ready."
                )
            },
            {
                "role": "user",
                "content": (
                    f"User prompt:{prompt}\n\nHere is the data:\n{df_str}\n\n"
                )
            }
        ]

        # Parse the structured JSON output directly into ChartInput
        response = self.client.responses.parse(
            model=self.model,
            input=messages,
            text_format=ChartInput,
        )
        print("Generated Chart.js code:", response.output_parsed.to_string())
        try:
            generated_code= response.output_parsed.to_string();
            return  OutputResponse(
                            type=ResponseType.chart,
                            content=generated_code
                        )
        except Exception as e:
            print(f"Error parsing response: {e}")
            generated_code = "const config = { type: 'bar', data: {...}, options: {...} };"
            return  OutputResponse(
                            type=ResponseType.language,
                            content="Failed to generate response, please try again.")
       
    


    # ----------- Function 2: Natural Language Explanation -----------
    def dataframe_to_natural_language(self, question: str, df: pd.DataFrame):
        df_str = self._df_to_string(df)

        messages = [
            {"role": "developer", "content": "You are a assitant for mazda dealer, you are responsible for answering questions about the warranty claims data,you are expert in datasets and you can explain datasets in plain English based on user's question, make sure you return output in markdown format."},
            {"role": "user", "content": f"Question:{question}\n\nData:\n{df_str}"}
        ]

        response =self.client.responses.create(
            model="gpt-4o-mini",
            input=messages,
            temperature=0.3
        )

        return response.output_text

    # ----------- Function 3: Excel.js Generator -----------
    def generate_exceljs_code(self, prompt: str, df: pd.DataFrame):
        df_str = self._df_to_string(df)

        messages = [
            {"role": "system", "content": "You are a JavaScript developer using the ExcelJS library to export data."},
            {"role": "user", "content": f"{prompt}\n\nData:\n{df_str}"}
        ]

        response = client.ChatCompletion.create(
            model=self.model,
            messages=messages,
            temperature=0.3
        )
        return response.choices[0].message['content']


if __name__ == '__main__':
    # Define file paths
    csv_file_path = './Mazda_Warranty_Synthetic_10000.csv'
    schema_file_path = './schema.json'

    # --- Step 1: Load the data and schema ---
    try:
        print(f"Loading data from {csv_file_path}...")
        main_df = pd.read_csv(csv_file_path)
        print("Data loaded successfully.")

        print(f"Loading schema from {schema_file_path}...")
        with open(schema_file_path, 'r') as f:
            data_schema = json.load(f)
        print("Schema loaded successfully.\n")

    except FileNotFoundError as e:
        print(f"Error: {e}. Please make sure the files are in the correct directory.")
        exit()

    # --- Step 2: Define the user prompt and call the function ---
    # Example user prompt
    # user_question = "Find all warranty claims for 'Engine' related issues with a repair cost greater than $1500."
    user_question = "What are the top 5 vehicle models with the highest average repair cost?"
    user_question = "Who is most efficient dealer in terms of warranty claims?"
    user_question = "Which dealer resolved most warranty claims in 2023?"
    user_question = "what is most deffective car?" 
    user_question = "What is the average repair cost for each vehicle model?"
    # user_question = "What is the average repair cost for each vehicle model in 2023?"
    user_question = "Create a bar chart showing total vehicle repared by dealer"
    user_question = "Create a pie chart showing the distribution of warranty claims by vehicle model"



    # Get the relevant data by calling the main function
    relevant_data_df = get_relevant_data(user_question, main_df, data_schema)

    # --- Step 3: Display the results ---
    if not relevant_data_df.empty:
        print("\n--- Resulting Data ---")
        print(relevant_data_df)
        print("----------------------\n")
    else:
        print("\nCould not retrieve or generate the data based on the prompt.")




