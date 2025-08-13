from fetchData import generate_claim_data_by_year, generate_claims_forecast, get_claim_status_distribution_by_year, get_claim_summary, get_last_month_claims
from sqliteClient import SQLiteClient


# client = SQLiteClient('warrenty.db')
# tables= client.list_tables()

# for i in client.list_tables():
#     print("table name: ", i)
#     print(client.get_table_structure(i))
#     print(client.get_first_rows(i))
#     print("--------------------------------")

db = SQLiteClient('warrenty2.db')
#
# summary = get_claim_summary(db=db)
# from pprint import pprint; pprint(summary)
# db.close()

# # For current year
# output_2025 = generate_claim_data_by_year(db, 2025)

# # For previous year
# output_2024 = generate_claim_data_by_year(db, 2024)

# output = get_last_month_claims(db)

# import pprint
# pprint.pprint(output)
# db.close()

# output = db.get_natural_language_response("How many claims were approved in the last month?");print(output)
# output = db.get_natural_language_response("What is the total number of rejected claims in July 2025?");print(output)
# output = db.get_natural_language_response("List all pending claims from the last 7 days.");print(output)
# output = db.get_natural_language_response("What was the highest claim amount approved in 2025?");print(output)
# output = db.get_natural_language_response("Show me the daily count of claims for the past 30 days.");print(output)
# output = db.get_natural_language_response("Which dealer submitted the most claims this year?");print(output)
# output = db.get_natural_language_response("How many claims were submitted by dealer code 40300?");print(output)


output = db.get_data_from_ai("List all pending claims from the last 7 days.");print(output)



# # forecast = generate_claims_forecast(db)

# # # Print one day for demonstration
# import json
# print(json.dumps(output, indent=2))
# db.close()
