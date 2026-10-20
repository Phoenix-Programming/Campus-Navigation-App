EMPLOYEES_REMOVED_EMAIL_SUBJECT: str = "Alert: {num_employees_removed} University Employee(s) Removed"


EMPLOYEES_REMOVED_EMAIL_HTML: str = """
<html>
    <body>
        <p>
            {num_employees_removed} university employee(s) have been automatically removed as part of the
            automated faculty directory web scraping.
        </p>

        <p>Please review the removed faculty/staff listed below.</p>

        {employees_removed_table}
    </body>
</html>
"""
