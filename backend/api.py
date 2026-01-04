import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from clerk_backend_api import authenticate_request as clerk_authenticate_request
from clerk_backend_api import AuthenticateRequestOptions as ClerkAuthenticateRequestOptions
from scheduler import (
    init_scheduler,
    schedule_single_from_db,
    init_datafeeds_scheduler,
    schedule_prediction_jobs_for_model,
    sync_prediction_jobs_for_model,delete_user
)
from data_processing import predict_for_model_now
from scheduler_utils import (
    update_user_fn,
    execute_python_code,
    TranspileRequest,
    RunResponse,
    RunPythonRequest,
    extract_user_id,
    transpile_or_run,
)
import os
load_dotenv() 

app = FastAPI(title="Scheduler API")
CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY")
security = HTTPBearer()

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        options = ClerkAuthenticateRequestOptions(secret_key=CLERK_SECRET_KEY)
        payload = clerk_authenticate_request(request, options)
        return payload
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Błąd weryfikacji tokenu: {str(e)}")

@app.on_event("startup")
async def _startup():
    print("Inicjalizacja zadań...")
    init_scheduler()
    init_datafeeds_scheduler()

@app.post("/transpile", summary="Transpiluje kod lub uruchamia go")
async def transpile_endpoint(payload: TranspileRequest, current_user: dict = Depends(get_current_user)):
    return transpile_or_run(payload, extract_user_id(current_user))

@app.post("/run/python", response_model=RunResponse, summary="Uruchamia kod Python")
async def run_python_endpoint(payload: RunPythonRequest, current_user: dict = Depends(get_current_user)):
    return execute_python_code(payload)

@app.post("/jobs/{job_id}", summary="Synchronizuje zadanie raportowe z bazy danych")
async def sync_job_from_db(job_id: str,current_user: dict = Depends(get_current_user)):
    return schedule_single_from_db(job_id)

@app.post("/models/{model_id}/jobs", summary="Dodaje zadania predykcyjne dla modelu i uruchamia je natychmiast")
async def add_model_prediction_jobs(model_id: str, current_user: dict = Depends(get_current_user)):
    schedule_prediction_jobs_for_model(model_id)
    return predict_for_model_now(model_id)

@app.post("/models/{model_id}/jobs/sync", summary="Synchronizuje zadania predykcyjne dla modelu")
async def sync_model_prediction_jobs(model_id: str, current_user: dict = Depends(get_current_user)):
    return sync_prediction_jobs_for_model(model_id)

@app.post("/users/functions/update", summary="Aktualizuje funkcje zdefiniowane przez użytkownika")
async def update_user_functions(current_user: dict = Depends(get_current_user)):
    return update_user_fn(extract_user_id(current_user))

@app.delete("/users", summary="Usuwa bieżącego użytkownika i wszystkie powiązane z nim dane")
async def delete_current_user(current_user: dict = Depends(get_current_user)):
    return delete_user(extract_user_id(current_user))
