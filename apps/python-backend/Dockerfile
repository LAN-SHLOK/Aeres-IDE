# Use a slim Python 3.11 base image
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install build dependencies (for things like chromadb/hnswlib if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy app code
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8008

# Expose the port
EXPOSE 8008

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8008"]
