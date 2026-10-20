NEW_USER_FEEDBACK_EMAIL_SUBJECT: str = "User Feedback Submitted"

NEW_USER_FEEDBACK_EMAIL_BODY: str = """
<html>
    <body>
        <p>New user feedback has been submitted, see the details below:</p>

        <p>
            <b>Feedback ID:</b> {feedback_id}<br/>
            <b>Timestamp:</b> {timestamp}<br/>
        </p>

        <p>
            <b>Submitter</b><br/>
            Username: {submitter_username}<br/>
            Email: {submitter_email}<br/>
        </p>

        <p>
            <b>Feedback</b><br/>
            {feedback}
        </p>
    </body>
</html>
"""
