FROM python:3.14-slim

# Set critical environment variables for Python and Poetry
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VERSION=2.4.1 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1

# Add Poetry to the executable PATH
ENV PATH="$POETRY_HOME/bin:$PATH"

# Install Poetry
RUN pip install "poetry==$POETRY_VERSION"

WORKDIR /backend

# Copy configuration files for Poetry
COPY pyproject.toml poetry.lock ./

# Install project dependencies (skipping development tools and the root package)
RUN poetry install --no-developer --no-root

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
