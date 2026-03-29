import os
from pydantic_settings import BaseSettings

_APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CASCADES_DIR = os.path.join(_APP_DIR, "resources", "cascades")


class Settings(BaseSettings):
    app_name: str = "NeuroFace API"
    app_version: str = "1.1.0"
    debug: bool = False

    ai_model: str = "lbph"
    dlib_enabled: bool = False
    data_dir: str = os.path.join(_APP_DIR, "resources", "data")

    images_dir: str = ""
    models_dir: str = ""
    pickles_dir: str = ""
    recognizers_dir: str = ""

    cascade_face: str = "haarcascade_frontalface_alt2.xml"
    cascade_eye: str = "haarcascade_eye.xml"
    cascade_smile: str = "haarcascade_smile.xml"
    cascade_profile: str = "haarcascade_profileface.xml"
    cascade_eye_glasses: str = "haarcascade_eye_tree_eyeglasses.xml"

    cors_allowed_origins: str = "*"

    chat_enabled: bool = False
    chat_model_endpoint: str = ""
    chat_model_name: str = ""
    chat_api_key: str = ""
    chat_max_tokens: int = 512
    chat_system_prompt: str = (
        "You are a facial analysis assistant. Analyze the provided facial detection "
        "data and answer questions about expressions, characteristics, and features "
        "of the detected faces. Be concise and informative."
    )

    ovms_enabled: bool = False
    ovms_rest_url: str = ""
    ovms_grpc_url: str = ""
    ovms_model_name: str = "face-detection-retail-0005"
    ovms_confidence_threshold: float = 0.5
    detection_method: str = "opencv"

    class Config:
        env_prefix = "NEUROFACE_"
        env_file = ".env"

    def model_post_init(self, __context):
        if not self.images_dir:
            self.images_dir = os.path.join(self.data_dir, "images")
        if not self.models_dir:
            self.models_dir = os.path.join(self.data_dir, "models")
        if not self.pickles_dir:
            self.pickles_dir = os.path.join(self.data_dir, "pickles")
        if not self.recognizers_dir:
            self.recognizers_dir = os.path.join(self.data_dir, "recognizers")

        for d in [self.images_dir, self.models_dir, self.pickles_dir, self.recognizers_dir]:
            os.makedirs(d, exist_ok=True)


settings = Settings()
