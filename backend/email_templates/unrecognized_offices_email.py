UNRECOGNIZED_OFFICES_EMAIL_SUBJECT: str = "Alert: {num_unrecognized_offices} New Unrecognized Offices"


UNRECOGNIZED_OFFICES_EMAIL_HTML: str = """
<html>
    <body>
        <p>
            {num_unrecognized_offices} new offices were found as part of the automated faculty
            directory web scraping that could not be associated with an established location.
        </p>

        <p>Please validate the following new office(s) and add any new location(s).</p>

        {recognized_offices_table}
    </body>
</html>
"""
