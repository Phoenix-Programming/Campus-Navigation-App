EMPLOYEES_ADDED_EMAIL_SUBJECT: str = "Alert: {num_employees_added} University Employee(s) Added"


EMPLOYEES_ADDED_EMAIL_HTML: str = """
<html>
    <body>
        <p>
            {num_employees_added} university employee(s) have been automatically added as part of the
            automated faculty directory web scraping.
        </p>

        <p>Please validate the new faculty/staff listed below.</p>

        {new_employees_table}
    </body>
</html>
"""
