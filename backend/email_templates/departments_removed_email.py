DEPARTMENTS_REMOVED_EMAIL_SUBJECT: str = "Alert: {num_departments_removed} Department(s) Removed"


DEPARTMENTS_REMOVED_EMAIL_HTML: str = """
<html>
    <body>
        <p>
            {num_departments_removed} department(s) have been automatically removed as part of the
            automated faculty directory web scraping.
        </p>

        <p>Please review the removed department(s) listed below.</p>

        {new_departments_table}
    </body>
</html>
"""
