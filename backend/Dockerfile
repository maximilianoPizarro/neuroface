FROM registry.access.redhat.com/ubi9/python-311:latest

ARG INSTALL_DLIB=false

USER 0
RUN dnf install -y libGL mesa-libGL && dnf clean all
USER 1001

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

RUN if [ "$INSTALL_DLIB" = "true" ]; then \
      pip install --no-cache-dir face_recognition; \
    fi

COPY app/ ./app/

USER 0
RUN mkdir -p /data/models/yolo && \
    curl -sL -o /data/models/yolo/yolov4-tiny.cfg \
      https://raw.githubusercontent.com/AlexeyAB/darknet/master/cfg/yolov4-tiny.cfg && \
    curl -sL -o /data/models/yolo/yolov4-tiny.weights \
      https://github.com/AlexeyAB/darknet/releases/download/yolov4/yolov4-tiny.weights && \
    chown -R 1001:0 /data
USER 1001

ENV NEUROFACE_AI_MODEL=lbph
ENV NEUROFACE_DATA_DIR=/data

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
