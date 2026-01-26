# --- Stage 1: Builder ---
# This stage installs dependencies into a temporary location.
FROM python:3.11-slim as builder

# Set the working directory inside the container.
WORKDIR /app

# Set environment variables for pip.
ENV PIP_TARGET=/app/deps
ENV PIP_ROOT_USER_ACTION=ignore

# Upgrade pip.
RUN pip install --upgrade pip

# Copy only the requirements file from the backend directory.
# This is a key optimization: Docker will cache this layer and only re-run
# 'pip install' if requirements.txt changes.
COPY backend/requirements.txt .

# Install dependencies.
RUN pip install --no-cache-dir -r requirements.txt

# --- Stage 2: Final Image ---
# This stage builds the final, lean image for production.
FROM python:3.11-slim

# Set the working directory for the final image.
WORKDIR /app

# Copy the installed dependencies from the builder stage.
COPY --from=builder /app/deps /usr/local/lib/python3.11/site-packages

# Copy the application code from the backend directory into the container.
# Note the source path is 'backend/app' and the destination is './app' (i.e., /app/app).
# --chown sets the correct permissions for our non-root user.
COPY --chown=1001:0 backend/app ./app
COPY --chown=1001:0 backend/asgi.py .

# Switch to a non-root user for enhanced security.
USER 1001

# Set environment variable for unbuffered Python output.
ENV PYTHONUNBUFFERED 1

# Expose the port the app will run on.
EXPOSE 8000

# The command to run the application using Gunicorn.
# The entrypoint is now 'asgi:app', referring to asgi.py.
CMD ["gunicorn", "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "asgi:app"]
