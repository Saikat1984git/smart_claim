import sqlite3
from openai import OpenAI
import pandas as pd
from typing import List
import re
from azureAiClient import AzureAiClient

class SQLiteClient:
    def __init__(self, db_name: str = 'mydb.db'):
        self.conn = sqlite3.connect(db_name)
        self.cursor = self.conn.cursor()
        self.client = AzureAiClient()

    def query(self, sql: str):
        return self.conn.execute(sql).fetchall()

    def list_tables(self):
        self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        return [row[0] for row in self.cursor.fetchall()]
    
    def execute(self, sql: str):
        cursor = self.conn.execute(sql)
        rows = cursor.fetchall()
        headers = [description[0] for description in cursor.description]
        # Convert rows to list of dictionaries
        result = [dict(zip(headers, row)) for row in rows]
        return result
        
    def get_table_structure(self, table_name: str):
        self.cursor.execute(f"PRAGMA table_info({table_name});")
        columns = self.cursor.fetchall()
        if not columns:
            return f"⚠️ Table '{table_name}' does not exist."
        structure = []
        for col in columns:
            structure.append(f"{col[1]} ({col[2]})")
        return " , ".join(structure)
    
    def get_first_rows(self, table_name: str, limit: int = 5):
        try:
            self.cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit};")
            rows = self.cursor.fetchall()
            col_names = [description[0] for description in self.cursor.description]
            return col_names, rows
        except sqlite3.Error as e:
            return f"⚠️ Error: {e}"

    def close(self):
        self.conn.commit()
        self.conn.close()

    def upload_excel(
        self,
        excel_path: str,
        sheet_names: List[str] = None,
        table_name: str = None,
        force_types: dict = None  # Example: {'Invoice_Date': 'TEXT', 'Amount': 'REAL'}
    ):


        # Load Excel file
        excel_data = pd.read_excel(excel_path, sheet_name=sheet_names or None)

        # If one sheet, wrap in a dict
        if isinstance(excel_data, pd.DataFrame):
            excel_data = {'Sheet1': excel_data}

        ddl_statements = {}

        for sheet_name, df in excel_data.items():
            clean_sheet_name = table_name or sheet_name.strip().replace(" ", "_")
            df.columns = [col.strip().replace(" ", "_") for col in df.columns]

            # Apply force types (e.g., convert columns to datetime/float/etc)
            if force_types:
                for col, dtype in force_types.items():
                    if col in df.columns:
                        try:
                            if dtype.upper() == 'TEXT':
                                df[col] = df[col].astype(str)
                            elif dtype.upper() == 'REAL':
                                df[col] = pd.to_numeric(df[col], errors='coerce')
                            elif dtype.upper() == 'INTEGER':
                                df[col] = pd.to_numeric(df[col], downcast='integer', errors='coerce')
                            elif dtype.upper() == 'DATE' or dtype.upper() == 'DATETIME':
                                df[col] = pd.to_datetime(df[col], errors='coerce')
                            else:
                                print(f"⚠️ Unknown force type '{dtype}' for column '{col}'")
                        except Exception as e:
                            print(f"❌ Failed to convert column '{col}' to {dtype}: {e}")

            # Write DataFrame to SQLite
            df.to_sql(clean_sheet_name, self.conn, if_exists='replace', index=False)
            print(f"✅ Sheet '{sheet_name}' uploaded to table '{clean_sheet_name}'.")

            # Fetch and return DDL
            self.cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{clean_sheet_name}';")
            ddl = self.cursor.fetchone()[0]
            ddl_statements[clean_sheet_name] = ddl

        return ddl_statements

    def get_all_details(self):
        output = ""
        for i in self.list_tables():
            output += f"Table name: {i}\n"
            output += f"Table structure: [ {self.get_table_structure(i)} ]\n"
            output += f"First 5 rows: \n {self.get_first_rows(i)}\n"
            output += "-" * 32 + "\n"
        return output

    def get_data_from_ai(self, prompt: str):
        system_prompt = f"""
        You are an expert writing query for a sqlite database.
        your task is to write a query to answer the user's question.
        You will be provided with the data's schema, a sample of the data (the first 5 rows), and a user's question.
        You will return the query in a string format.
        database structure: {self.get_all_details()}
        """
        user_prompt = f"""
            User prompt: {prompt}
        """
        content = self.client.send_system_and_user_message(
            model="o4-mini",
            messeges=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
        )
        
        # Extract the first code block inside triple backticks (with or without language tag)
        match = re.search(r"```(?:\w+)?\n(.*?)```", content, re.DOTALL)

        if match:
            generated_code = match.group(1).strip()
        else:
            generated_code = content  # fallback to raw content

        # Remove markdown wrapping if present
        generated_code = generated_code.removeprefix("```sql").removeprefix("```").strip()
        generated_code = generated_code.removesuffix("```").strip()
        generated_code = generated_code.strip().strip('"').strip("'")
        generated_code=generated_code.replace("\n","  ")
        
        print("\n--- Generated SQL Code ---")
        print(generated_code)
        print("-----------------------------\n")  

        result = self.execute(generated_code)

        return result
    
    def get_natural_language_response(self, prompt: str):
        data=self.get_data_from_ai(prompt)
        messages = [
            {"role": "developer", "content": "You are a data analyst who explains datasets in plain English based on user's question, make sure you return output in markdown format."},
            {"role": "user", "content": f"Question:{prompt}\n\nData:\n{data}"}
        ]

        response =self.client.send_system_and_user_message(
            model="gpt-4o-mini",
            messeges=messages,
            temperature=0.3
        )

        return response
       
    




