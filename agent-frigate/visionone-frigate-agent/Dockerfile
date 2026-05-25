FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY visionone_frigate_agent.py /app/visionone_frigate_agent.py

CMD ["python", "/app/visionone_frigate_agent.py"]

