NEW_BUG_REPORT_EMAIL_SUBJECT: str = "Bug Report Submitted"

NEW_BUG_REPORT_EMAIL_BODY: str = """
<html>
    <body>
        <p>A new bug report has been opened, see the details below:</p>

        <p>
            <b>Bug Report ID:</b> {bug_report_id}<br/>
            <b>Session ID:</b> {session_id}<br/>
            <b>Timestamp:</b> {timestamp}<br/>
        </p>

        <p>
            <b>Submitter</b><br/>
            Username: {submitter_username}<br/>
            Email: {submitter_email}<br/>
        </p>

        <p>
            <b>Description</b><br/>
            {description}<br/>
        </p>

        <p>
            <b>Reproduction Steps</b><br/>
            {repro_steps}
        </p>
    </body>
</html>
"""
