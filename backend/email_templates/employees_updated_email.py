EMPLOYEES_UPDATED_EMAIL_SUBJECT: str = "Alert: {num_employees_updated} University Employee(s) Updated"


EMPLOYEES_UPDATED_EMAIL_HTML: str = """
<html>
    <body>
        <p>
            {num_employees_updated} university employee(s) have been automatically updated as part of the
            automated faculty directory web scraping.
        </p>

        <p>Please validate the updated faculty/staff listed below.</p>

        {updated_employees_table}
    </body>
</html>
"""
