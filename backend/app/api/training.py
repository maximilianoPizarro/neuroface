import uuid

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

router = APIRouter(tags=["training"])


@router.post("/images")
async def upload_image(
    label: str = Form(...),
    file: UploadFile = File(...),
):
    from app.main import face_engine

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    path = face_engine.save_image(label, contents, filename)

    return {"status": "ok", "label": label, "filename": filename, "path": path}


@router.get("/images/{label}")
async def list_images(label: str):
    from app.main import face_engine

    images = face_engine.get_images_for_label(label)
    return {"label": label, "images": images, "count": len(images)}


@router.delete("/images/{label}")
async def delete_images(label: str):
    from app.main import face_engine

    count = face_engine.delete_label_images(label)
    if count == 0:
        raise HTTPException(status_code=404, detail=f"No images found for label '{label}'")
    return {"status": "ok", "label": label, "deleted": count}


@router.get("/labels")
async def list_labels():
    from app.main import face_engine

    labels = face_engine.get_labels()
    return {"labels": labels, "count": len(labels)}


@router.post("/train")
async def train_model():
    from app.main import face_engine

    try:
        result = face_engine.train()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "ok", **result}
