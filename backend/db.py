import json
import os
from typing import List, Optional

from google.cloud import bigquery
from google.oauth2 import service_account

from config import GCP_PROJECT_ID

_client = None


def get_client() -> bigquery.Client:
    global _client
    if _client is None:
        creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
        if creds_json:
            info = json.loads(creds_json)
            credentials = service_account.Credentials.from_service_account_info(info)
            _client = bigquery.Client(project=GCP_PROJECT_ID, credentials=credentials)
        else:
            # Falls back to GOOGLE_APPLICATION_CREDENTIALS file or default ADC
            _client = bigquery.Client(project=GCP_PROJECT_ID)
    return _client


def run_query(sql: str, params: Optional[List[bigquery.ScalarQueryParameter]] = None):
    """Execute a BigQuery SQL query and return rows as list of dicts."""
    client = get_client()
    job_config = bigquery.QueryJobConfig()
    if params:
        job_config.query_parameters = params
    result = client.query(sql, job_config=job_config).result()
    return [dict(row) for row in result]
