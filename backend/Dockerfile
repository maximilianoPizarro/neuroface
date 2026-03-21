FROM registry.access.redhat.com/ubi9/python-311:latest

USER 0
RUN dnf install -y libGL mesa-libGL && dnf clean all
USER 1001

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

ENV NEUROFACE_AI_MODEL=lbph
ENV NEUROFACE_DATA_DIR=/data

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
