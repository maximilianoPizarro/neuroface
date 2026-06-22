FROM registry.access.redhat.com/ubi9/python-311:latest

USER 0

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
    -r /tmp/requirements.txt && \
    pip uninstall -y opencv-python 2>/dev/null || true && \
    pip install --no-cache-dir opencv-python-headless==4.11.0.86 && \
    rm /tmp/requirements.txt

COPY server.py /opt/app-root/src/server.py

RUN mkdir -p /mnt/models && chown -R 1001:0 /mnt/models /opt/app-root/src

USER 1001

ENV MODEL_PATH=/mnt/models/best.pt
ENV MODEL_NAME=yolo-ppe
ENV CONFIDENCE=0.5

EXPOSE 8080

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
