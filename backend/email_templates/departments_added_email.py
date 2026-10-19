DEPARTMENTS_ADDED_EMAIL_SUBJECT: str = "Alert: {num_departments_added} Department(s) Added"


DEPARTMENTS_ADDED_EMAIL_HTML: str = """
<html>
    <body>
        <p>
            {num_departments_added} department(s) have been automatically added as part of the
            automated faculty directory web scraping.
        </p>

        <p>Please validate the new department(s) listed below.</p>

        {new_departments_table}
    </body>
</html>
"""
