import os
from pathlib import Path

from diffusers import UNet2DConditionModel, StableDiffusionPipeline
from ldm.invoke.globals import global_lora_models_dir
from .kohya_lora_manager import KohyaLoraManager
from typing import Optional, Dict

class LoraCondition:
    name: str
    weight: float

    def __init__(self,
                 name,
                 weight: float = 1.0,
                 unet: UNet2DConditionModel=None,  # for diffusers format LoRAs
                 kohya_manager: Optional[KohyaLoraManager]=None,  # for KohyaLoraManager-compatible LoRAs
                 ):
        self.name = name
        self.weight = weight
        self.kohya_manager = kohya_manager
        self.unet = unet

    def __call__(self):
        # TODO: make model able to load from huggingface, rather then just local files
        path = Path(global_lora_models_dir(), self.name)
        if path.is_dir():
            if not self.unet:
                print(f"   ** Unable to load diffusers-format LoRA {self.name}: unet is None")
                return
            if self.unet.load_attn_procs:
                file = Path(path, "pytorch_lora_weights.bin")
                if file.is_file():
                    print(f">> Loading LoRA: {path}")
                    self.unet.load_attn_procs(path.absolute().as_posix())
                else:
                    print(f"   ** Unable to find valid LoRA at: {path}")
            else:
                print("   ** Invalid Model to load LoRA")
        elif self.kohya_manager:
            self.kohya_manager.apply_lora_model(self.name,self.weight)
        else:
            print("   ** Unable to load LoRA")

    def unload(self):
        if self.kohya_manager:
            print(f'>> unloading LoRA {self.name}')
            self.kohya_manager.unload_applied_lora(self.name)

class LoraManager:
    def __init__(self, pipe: StableDiffusionPipeline):
        # Kohya class handles lora not generated through diffusers
        self.kohya = KohyaLoraManager(pipe, global_lora_models_dir())
        self.unet = pipe.unet

    def set_loras_conditions(self, lora_weights: list):
        conditions = []
        if len(lora_weights) > 0:
            for lora in lora_weights:
                conditions.append(LoraCondition(lora.model, lora.weight, self.unet, self.kohya))

        if len(conditions) > 0:
            return conditions

        return None

    @classmethod
    def list_loras(self)->Dict[str, Path]:
        path = Path(global_lora_models_dir())
        models_found = dict()
        for root,_,files in os.walk(path):
            for x in files:
                name = Path(x).stem
                suffix = Path(x).suffix
                if suffix in [".ckpt", ".pt", ".safetensors"]:
                    models_found[name]=Path(root,x)
        return models_found

