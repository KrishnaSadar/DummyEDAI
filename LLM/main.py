# main.py
# FastAPI service for analyzing datasets with DuckDB + Gemini (Google Generative AI)

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import duckdb
import google.generativeai as genai
import json
import io
import os
import dotenv

# ------------------------- Config & Utils -------------------------

dotenv.load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    # Let it start anyway, but fail fast when we try to call the model
    print("WARNING: GEMINI_API_KEY not set. LLM calls will fail.")
genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(
    title="Data Analyst Assistant API",
    description="API to analyze datasets, generate and execute queries, and provide AI-driven insights.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# Path base (LLM folder assumed sibling of Backend)
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(HERE, "..", "Backend"))

def convert_to_json_object(input_str: str):
    """
    Accepts a string that may be wrapped in ```json ... ``` and returns a Python dict.
    """
    s = input_str.strip()
    if s.startswith("```json"):
        s = s[len("```json"):].strip()
    if s.endswith("```"):
        s = s[:-3].strip()
    return json.loads(s)

def clean_sql(s: str) -> str:
    """
    Strip common LLM wrappers like ```sql fences, leading 'sql', and 'SQL QUERY:' headers.
    Leaves only raw SQL.
    """
    if not s:
        return s
    sql = s.strip()

    # Remove fenced code blocks
    if sql.lower().startswith("```sql"):
        sql = sql[6:].strip()  # remove ```sql
    if sql.startswith("```"):
        sql = sql[3:].strip()
    if sql.endswith("```"):
        sql = sql[:-3].strip()

    # Remove headings/prefixes often added by LLMs
    prefixes = ["sql query:", "query:", "sql:"]
    for p in prefixes:
        if sql.lower().startswith(p):
            sql = sql[len(p):].strip()

    # Sometimes models prefix with "sql" or "SQL"
    if sql.lower().startswith("sql"):
        # handle "sql\nSELECT ..." or "sql SELECT ..."
        after = sql[3:].lstrip(": \n")
        if after:
            sql = after

    return sql.strip()

# ------------------------- Pydantic Models -------------------------

class AnalyzePathRequest(BaseModel):
    file_path: str
    prompt: str

class FilePathAnswerRequest(BaseModel):
    file_path: str
    question: str

class InsightsRequest(BaseModel):
    schema_info: str
    data_preview: str

class FilePathRequest(BaseModel):
    file_path: str

class FilePromptRequest(BaseModel):
    file_path: str
    prompt: str

# ------------------------- Data Loading -------------------------

def get_dataframe_from_file(file: UploadFile) -> pd.DataFrame:
    """
    Reads an uploaded file (CSV, Excel, JSON, TXT) and returns a DataFrame.
    """
    try:
        content = file.file.read()
        file.file.seek(0)
        filename = file.filename.lower()

        if filename.endswith(".csv"):
            return pd.read_csv(io.StringIO(content.decode("utf-8")))
        elif filename.endswith((".xls", ".xlsx")):
            return pd.read_excel(io.BytesIO(content))
        elif filename.endswith(".json"):
            try:
                return pd.read_json(io.StringIO(content.decode("utf-8")))
            except ValueError:
                data = json.loads(content)
                return pd.DataFrame(data)
        elif filename.endswith(".txt"):
            return pd.read_csv(io.StringIO(content.decode("utf-8")), delimiter=r"\s+")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: {filename.split('.')[-1]}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

def get_dataframe_from_path(file_path: str) -> pd.DataFrame:
    """
    Reads a file from a local path and returns a DataFrame.
    """
    try:
        absolute_path = os.path.abspath(file_path)
        if not os.path.exists(absolute_path):
            raise FileNotFoundError

        filename = os.path.basename(absolute_path).lower()

        if filename.endswith(".csv"):
            return pd.read_csv(absolute_path)
        elif filename.endswith((".xls", ".xlsx")):
            return pd.read_excel(absolute_path)
        elif filename.endswith(".json"):
            return pd.read_json(absolute_path)
        elif filename.endswith(".txt"):
            return pd.read_csv(absolute_path, delimiter=r"\s+")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: {filename.split('.')[-1]}")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found at resolved path: {absolute_path}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file from path: {str(e)}")

def get_schema(df: pd.DataFrame) -> dict:
    """
    Generates a structured schema description from a DataFrame.
    """
    schema = {"row_count": int(len(df)), "columns": []}
    for col in df.columns:
        schema["columns"].append({
            "name": col,
            "dtype": str(df[col].dtype),
            "non_null_count": int(df[col].count()),
            "unique_values": int(df[col].nunique()),
        })
    return schema

# ------------------------- LLM Helpers -------------------------

async def _safe_gemini_call(prompt: str) -> str:
    """
    Calls Gemini and returns response text.
    Converts quota errors to HTTP 429 for clarity.
    """
    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        resp = await model.generate_content_async(prompt)
        return (resp.text or "").strip()
    except Exception as e:
        # Surface rate limit / quota as 429 if present in message
        msg = str(e)
        if "quota" in msg.lower() or "429" in msg:
            raise HTTPException(status_code=429, detail=f"LLM rate limit/quota error: {msg}")
        raise HTTPException(status_code=500, detail=f"LLM error: {msg}")

async def generate_duckdb_query(schema_info: str, user_query: str, data_preview: str) -> str:
    """
    Single-table SQL generation.
    """
    prompt = f"""
You are an expert DuckDB data analyst. Convert the user's natural language question into a DuckDB SQL query.
The ONLY table name is 'data'.

Database Schema (JSON):
{schema_info}

Data Preview (first rows as JSON):
{data_preview}

User Question:
\"\"\"{user_query}\"\"\"

Instructions:
1) Output ONLY the raw DuckDB SQL (no markdown, no explanations, no code fences).
2) Table name is exactly: data
3) Do not use DDL/DML (DROP, DELETE, INSERT, UPDATE, ALTER).
"""
    text = await _safe_gemini_call(prompt)
    sql = clean_sql(text)

    # Basic safety
    if any(k in sql.upper() for k in ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER"]):
        raise HTTPException(status_code=400, detail="Generated query contains disallowed keywords.")
    return sql

async def generate_advanced_duckdb_query(question: str, combined_schema: dict, tables: dict, table_names: dict) -> str:
    """
    Multi-table SQL generation (JOIN/UNION/etc). The tables will be registered as table_0, table_1, ...
    """
    schema_description = json.dumps(combined_schema, indent=2)
    table_name_list = ", ".join([f'"{n}" as table_{i}' for i, n in enumerate(tables.keys())])

    prompt = f"""
You are an expert SQL developer for DuckDB.

QUESTION:
{question}

AVAILABLE TABLES (JSON description):
{schema_description}

The tables are registered in DuckDB with these exact names:
{", ".join([f"table_{i}" for i in range(len(tables))])}

Rules:
1) Use only table_0, table_1, ... as table names (NOT original file names).
2) Use proper JOINs/UNION/etc when needed.
3) Output ONLY the raw SQL query (no markdown, no explanations, no code fences).
4) No DDL/DML (DROP/DELETE/INSERT/UPDATE/ALTER).
"""
    text = await _safe_gemini_call(prompt)
    sql = clean_sql(text)

    if any(k in sql.upper() for k in ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER"]):
        raise HTTPException(status_code=400, detail="Generated query contains disallowed keywords.")
    return sql

async def generate_ai_insights(schema_info: str, data_json: str, prompt: str) -> str:
    """
    Free-form insight generation over JSON data.
    """
    full_prompt = f"""
Database Schema (JSON):
{schema_info}

Data (JSON array of records):
{data_json}

Task:
{prompt}

Return only the answer (no extra prose).
"""
    return await _safe_gemini_call(full_prompt)

async def generate_text_response(schema_info: str, data_preview: str, prompt: str) -> str:
    """
    Simple text response over preview + schema (used by /analyze-from-path).
    """
    full_prompt = f"""
Database Schema (JSON):
{schema_info}

Data Preview (JSON):
{data_preview}

Task:
{prompt}

Return only the answer (no extra prose).
"""
    return await _safe_gemini_call(full_prompt)

# ------------------------- Endpoints -------------------------

@app.post("/upload-and-analyze/")
async def upload_and_analyze(file: UploadFile = File(...)):
    df = get_dataframe_from_file(file)
    schema = get_schema(df)
    data_preview = json.loads(df.head().to_json(orient="records"))
    return {"filename": os.path.basename(file.filename), "schema": schema, "data_preview": data_preview}

@app.post("/get-answer/")
async def get_answer(file: UploadFile = File(...), question: str = Form(...)):
    """
    Single-table flow: generate SQL for 'data' and execute it.
    """
    df = get_dataframe_from_file(file)
    schema = get_schema(df)
    schema_str = json.dumps(schema)
    data_preview_str = df.head().to_json(orient="records")

    sql_query = await generate_duckdb_query(schema_str, question, data_preview_str)

    try:
        con = duckdb.connect(database=":memory:")
        con.register("data", df)
        result_df = con.execute(sql_query).fetchdf()
        result_json = json.loads(result_df.to_json(orient="records"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error executing generated query: {str(e)}. Query was: '{sql_query}'")
    finally:
        con.close()

    return {"question": question, "generated_sql": sql_query, "result": result_json}

def execute_advanced_sql_query(sql_query: str, tables: dict) -> list:
    """
    Execute a multi-table SQL over registered table_0, table_1, ...
    """
    try:
        con = duckdb.connect(database=":memory:")
        for i, df in tables.items():
            con.register(f"table_{i}", df)

        result_df = con.execute(sql_query).fetchdf()
        result_json = json.loads(result_df.to_json(orient="records"))
        con.close()
        return result_json
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing advanced SQL: {str(e)}")

@app.post("/advanced-sql-query/")
async def advanced_sql_query(
    table_0: UploadFile = File(...),
    table_name_0: str = Form(...),
    question: str = Form(...),
    table_count: int = Form(...),
    table_1: UploadFile = File(None), table_name_1: str = Form(None),
    table_2: UploadFile = File(None), table_name_2: str = Form(None),
    table_3: UploadFile = File(None), table_name_3: str = Form(None),
    table_4: UploadFile = File(None), table_name_4: str = Form(None),
):
    """
    Multi-table flow; also works if only table_0 is provided.
    """
    try:
        tables = {}
        table_names = {}

        tables[0] = get_dataframe_from_file(table_0)
        table_names[0] = table_name_0

        additional = [(table_1, table_name_1), (table_2, table_name_2), (table_3, table_name_3), (table_4, table_name_4)]
        for i, (tf, tn) in enumerate(additional, 1):
            if tf is not None and tn is not None:
                try:
                    tables[i] = get_dataframe_from_file(tf)
                    table_names[i] = tn
                except Exception as e:
                    print(f"Error processing table {i}: {e}")

        combined_schema = {}
        for i, df in tables.items():
            combined_schema[f"table_{i}"] = {
                "duckdb_table_name": f"table_{i}",
                "original_filename": table_names.get(i, f"table_{i}"),
                "columns": list(df.columns),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.to_dict().items()},
                "shape": list(df.shape),
                "preview": df.head(3).to_dict("records"),
            }

        print(f"Generating SQL for {len(tables)} tables: {list(table_names.values())}")
        sql_query = await generate_advanced_duckdb_query(question, combined_schema, tables, table_names)

        # (Optional) quick log of which canonical names appear
        for i in range(len(tables)):
            if f"table_{i}" in sql_query:
                print(f"✅ SQL uses correct table name: table_{i}")

        print(f"Executing SQL query: {sql_query}")
        result = execute_advanced_sql_query(sql_query, tables)

        return {
            "generated_sql": sql_query,
            "result": result,
            "tables_used": list(table_names.values()),
            "table_count": len(tables),
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-from-path/")
async def analyze_from_path(request: AnalyzePathRequest):
    """
    Reads a file (path) and returns a text response from the LLM based on schema + preview.
    """
    df = get_dataframe_from_path(request.file_path)
    schema = get_schema(df)
    schema_str = json.dumps(schema)
    data_preview_str = df.head().to_json(orient="records")

    llm_response = await generate_text_response(schema_str, data_preview_str, request.prompt)
    return {"prompt": request.prompt, "response": llm_response}

@app.post("/answer-from-path/")
async def answer_from_path(request: FilePathAnswerRequest):
    """
    Reads a file (path), generates SQL for table 'data', executes it, returns results.
    """
    df = get_dataframe_from_path(request.file_path)
    schema = get_schema(df)
    schema_str = json.dumps(schema)
    data_preview_str = df.head().to_json(orient="records")

    sql_query = await generate_duckdb_query(schema_str, request.question, data_preview_str)

    try:
        con = duckdb.connect(database=":memory:")
        con.register("data", df)
        result_df = con.execute(sql_query).fetchdf()
        result_json = json.loads(result_df.to_json(orient="records"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error executing generated query: {str(e)}. Query was: '{sql_query}'")
    finally:
        con.close()

    return {"question": request.question, "generated_sql": sql_query, "result": result_json}

@app.post("/generate-insights/")
async def get_insights_from_llm(request: InsightsRequest):
    insights = await generate_ai_insights(request.schema_info, request.data_preview, "Provide concise insights.")
    return {"insights": insights}

@app.post("/analyze-file-with-prompt/")
async def analyze_file_with_prompt(request: FilePromptRequest):
    """
    Accepts file paths like ".\\files\\demo.csv" (relative to Backend) and a prompt.
    Loads FULL data and asks the LLM to answer. Returns JSON if the LLM returns JSON.
    """
    try:
        rel_path = request.file_path.strip().replace("\\", os.path.sep).replace("/", os.path.sep)

        # Expect ".\files\..." (Windows) from the Node backend
        expected_prefix = f".{os.path.sep}files{os.path.sep}"
        if not rel_path.startswith(expected_prefix):
            raise HTTPException(status_code=400, detail="File path must be relative and start with .\\files\\")
        # Resolve to the actual file under Backend
        server_path = os.path.join(BACKEND_ROOT, rel_path[2:])

        df = get_dataframe_from_path(server_path)

        schema = get_schema(df)
        schema_str = json.dumps(schema)
        data_full_str = df.to_json(orient="records")  # full data

        insights = await generate_ai_insights(schema_str, data_full_str, request.prompt)

        # If the model returns JSON (your Node expects strict JSON), try to parse it
        try:
            ans = convert_to_json_object(insights)
            return ans
        except Exception:
            # If it wasn't JSON, still return the raw string
            return {"raw_response": insights}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating answer: {str(e)}")
