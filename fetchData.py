from datetime import datetime, timedelta
import calendar
from collections import defaultdict
from sqliteClient import SQLiteClient
import random


def get_claim_summary(db: SQLiteClient, status_code: str='T' ):
    print("status_code BA: ", status_code,status_code not in ['A', 'R', 'P','T'])
    if status_code not in ['A', 'R', 'P','T']:
        raise ValueError("Invalid status. Use 'A' for Approved, 'R' for Rejected, or 'P' for Pending.")

    today = datetime.today().date() + timedelta(weeks=0)
    year, month, week = today.year, today.month, today.isocalendar()[1]

    def get_week_range(y, w):
        start = datetime.strptime(f'{y}-W{w - 1}-1', "%Y-W%W-%w").date()
        end = start + timedelta(days=6)
        print(start, end)
        return start, end

    def get_month_range(y, m):
        start = datetime(y, m, 1).date()
        last_day = calendar.monthrange(y, m)[1]
        end = datetime(y, m, last_day).date()
        return start, end

    def get_year_range(y):
        return datetime(y, 1, 1).date(), datetime(y, 12, 31).date()

    def fetch_claims(start, end):
        if status_code=='T':
            query = f"""
            SELECT CLM_EST_AM FROM warrenty_table
            WHERE date(RPR_DT) BETWEEN date('{start}') AND date('{end}')
            """
        else:
            query = f"""
            SELECT CLM_EST_AM FROM warrenty_table
            WHERE date(RPR_DT) BETWEEN date('{start}') AND date('{end}')
            AND STS_CD = '{status_code}'
            """
        return db.query(query)

    def compute_metrics(so_far_data, full_period_data):
        original_total = len(so_far_data)
        projected_total = len(full_period_data)

        cost = sum(row[0] for row in so_far_data)

        diff = projected_total - original_total
        pct = round((diff / original_total) * 100, 1) if original_total > 0 else 0
        trend = 'up' if diff >= 0 else 'down'

        return {
            'originalClaim': original_total,
            'projectedClaim': projected_total,
            'historicalChange': abs(diff),
            'historicalChangeType': trend,
            'percentageIncrease': pct,
            'value': original_total,
            'change': abs(diff),
            'changeType': trend,
            'cost': round(cost, 2)
        }

    # === Time Ranges ===
    week_start, week_end = get_week_range(year, week)
    month_start, month_end = get_month_range(year, month)
    year_start, year_end = get_year_range(year)

    result = {
            'week': compute_metrics(
                fetch_claims(week_start, today),
                fetch_claims(week_start, week_end)
            ),
            'month': compute_metrics(
                fetch_claims(month_start, today),
                fetch_claims(month_start, month_end)
            ),
            'year': compute_metrics(
                fetch_claims(year_start, today),
                fetch_claims(year_start, year_end)
            )
        }
    

    return result



def generate_claim_data_by_year(db: SQLiteClient, year: int):
    today = datetime.today().date()
    current_year = today.year
    current_month = today.month

    def get_claims_by_month(y, m, status=None, from_day=1, to_day=31):
        # Only query within the exact day range if needed (used for current month)
        query = f"""
        SELECT COUNT(*) FROM warrenty_table
        WHERE strftime('%Y', RPR_DT) = '{y}' 
        AND strftime('%m', RPR_DT) = '{str(m).zfill(2)}'
        AND CAST(strftime('%d', RPR_DT) AS INTEGER) BETWEEN {from_day} AND {to_day}
        """
        if status:
            query += f" AND STS_CD = '{status}'"
        return db.query(query)[0][0]

    historical_total, historical_accepted, historical_rejected = [], [], []
    forecast_total, forecast_accepted, forecast_rejected = [], [], []

    # Handle current year: split into historical and forecast
    if year == current_year:
        for m in range(1, 13):
            if m < current_month:
                # Full month historical
                accepted = get_claims_by_month(year, m, 'A')
                rejected = get_claims_by_month(year, m, 'R')
            # elif m == current_month:
            #     # Partial current month historical (up to today)
            #     accepted = get_claims_by_month(year, m, 'A', 1, today.day)
            #     rejected = get_claims_by_month(year, m, 'R', 1, today.day)
            else:
                # Future months (forecast)
                accepted = get_claims_by_month(year, m, 'A')
                rejected = get_claims_by_month(year, m, 'R')
                forecast_total.append(accepted + rejected)
                forecast_accepted.append(accepted)
                forecast_rejected.append(rejected)
                continue

            # Store in historical
            historical_total.append(accepted + rejected)
            historical_accepted.append(accepted)
            historical_rejected.append(rejected)

        return {
                'historical': {
                    'total': historical_total,
                    'accepted': historical_accepted,
                    'rejected': historical_rejected
                },
                'forecast': {
                    'total': forecast_total,
                    'accepted': forecast_accepted,
                    'rejected': forecast_rejected
                }
            }
        

    else:
        # For past years, all 12 months are historical
        for m in range(1, 13):
            accepted = get_claims_by_month(year, m, 'A')
            rejected = get_claims_by_month(year, m, 'R')
            historical_total.append(accepted + rejected)
            historical_accepted.append(accepted)
            historical_rejected.append(rejected)

        return  {
                'total': historical_total,
                'accepted': historical_accepted,
                'rejected': historical_rejected
            }
        

def get_claim_status_distribution_by_year(db: SQLiteClient, year: int):
    statuses = {
        'A': {'name': 'Approved', 'color': '#34D399'},
        'P': {'name': 'Pending',  'color': '#FBBF24'},
        'R': {'name': 'Rejected', 'color': '#F87171'}
    }

    # Fetch total claims per status
    result = []
    total = 0
    status_counts = {}

    for code in statuses:
        query = f"""
        SELECT COUNT(*) FROM warrenty_table
        WHERE strftime('%Y', RPR_DT) = '{year}' AND STS_CD = '{code}'
        """
        count = db.query(query)[0][0]
        status_counts[code] = count
        total += count

    # Calculate percentages and format output
    for code, meta in statuses.items():
        value = status_counts.get(code, 0)
        percentage = (value / total * 100) if total > 0 else 0

        result.append({
            'name': meta['name'],
            'value': value,
            'percentage': round(percentage, 2),
            'color': meta['color']
        })

    return result

def generate_claims_forecast(sql_client):
    # Map car code to model
    car_code_to_model = {
        code: model.upper().replace(" ", "_")
        for code, model, *_ in sql_client.query("SELECT Code, Model, Release_Year FROM car_table")
    }

    # Map part codes to part names
    part_code_to_name = {
        code: name
        for name, code, *_ in sql_client.query("SELECT partName, partCode, priceUSD FROM part_table")
    }

    # Get all records from warranty table
    warranty_records = sql_client.query("SELECT RPR_DT, CRLN_CD, PART_CD, PART_QT FROM warrenty_table")

    # Initialize result structure
    forecast_data = defaultdict(lambda: defaultdict(lambda: {
        "total_actual_claims": 0,
        "total_predicted_claims": 0,
        "actual_parts": defaultdict(int),
        "predicted_parts": defaultdict(int)
    }))

    # Process each warranty record
    for rpr_dt, crln_cd, part_cd_str, part_qt_str in warranty_records:
        try:
            date_str = rpr_dt.split()[0]
            model_name = car_code_to_model.get(crln_cd)
            if not model_name:
                continue

            part_codes = part_cd_str.split(',')
            part_qts = list(map(int, part_qt_str.split(',')))

            if len(part_codes) != len(part_qts):
                continue  # Skip malformed rows

            # Update actual claims
            daily_model_data = forecast_data[date_str][model_name]
            daily_model_data["total_actual_claims"] += 1

            for code, qty in zip(part_codes, part_qts):
                part_name = part_code_to_name.get(code, code)
                daily_model_data["actual_parts"][part_name] += qty

        except Exception as e:
            print(f"Skipping row due to error: {e}")
            continue

    # Add predictions with 10–15% error
    for date_str, models in forecast_data.items():
        for model, data in models.items():
            actual_claims = data["total_actual_claims"]
            predicted_claims = int(round(actual_claims * (1 + random.uniform(-0.15, 0.15))))
            data["total_predicted_claims"] = max(0, predicted_claims)

            for part, qty in data["actual_parts"].items():
                predicted_qty = int(round(qty * (1 + random.uniform(-0.15, 0.15))))
                data["predicted_parts"][part] = max(0, predicted_qty)

    return dict(forecast_data)



def get_last_month_claims(db):
    today = datetime.today().date()
    one_month_ago = today - timedelta(days=30)

    query = f"""
        SELECT w.VIN_CD, w.CLM_EST_AM, w.STS_CD, c.Model, w.RPR_DT
        FROM warrenty_table w
        JOIN car_table c ON w.CRLN_CD = c.Code
        WHERE DATE(w.RPR_DT) BETWEEN DATE('{one_month_ago}') AND DATE('{today}')
    """

    rows = db.query(query)

    result = []
    for row in rows:
        vin_cd, claim_amt, status, model_name, repair_date = row
        formatted = {
            "vincd": vin_cd,
            "claimAmount": f"{claim_amt:.2f}",
            "status": "Approved" if status == 'A' else ("Rejected" if status == 'R' else "Pending"),
            "model": model_name.strip(),
            "repair_date": datetime.strptime(repair_date, "%Y-%m-%d %H:%M:%S").strftime("%d-%m-%Y")
        }
        result.append(formatted)

    return result



