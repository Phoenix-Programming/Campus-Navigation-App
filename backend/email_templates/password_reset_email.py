PWD_RESET_EMAIL_SUBJECT: str = "Reset Your Password - Florida Poly Campus Map"


PWD_RESET_EMAIL_BODY: str = """Hi {username},

You requested to reset your password. Click the link below to set a new password:

{reset_url}

This link will expire in {reset_token_expire_minutes} minutes.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
Florida Poly Campus Map Team


The Florida Poly Campus Map and its developers are not affiliated with Florida Polytechnic University.
"""
