from sqliteClient import SQLiteClient


client = SQLiteClient('warrenty2.db')

# Upload all sheets from the Excel file
ddl_statements = client.upload_excel(excel_path= './data/car_parts_data.xlsx', table_name="part_table")
print(ddl_statements)

# Upload all sheets from the Excel file
ddl_statements = client.upload_excel(excel_path= './data/sublet_codes.xlsx', table_name="sublet_table")
print(ddl_statements)

# Upload all sheets from the Excel file
ddl_statements = client.upload_excel(excel_path= './data/warranty_claims_data_2021-2025.xlsx', table_name="warrenty_table",force_types={
        "RPR_DT": "DATE",
    })
print(ddl_statements)

# Upload all sheets from the Excel file
ddl_statements = client.upload_excel(excel_path= './data/mazda_crln_cd_mapping.xlsx', table_name="car_table")
print(ddl_statements)


# # List tables created
# print(client.list_tables())

# # Query any table (e.g., if sheet was "Sheet1")
print(client.query("SELECT * FROM warrenty_table WHERE RPR_DT >= '2025-03-01' AND RPR_DT < '2025-04-01';"))

client.close()
