"""omnibus module to be used with the runwayml 9-channel custom inpainting model"""

import torch
import numpy as  np
from PIL import Image
from ldm.invoke.generator.base import downsampling
from ldm.invoke.generator.img2img import Img2Img
from ldm.invoke.generator.txt2img import Txt2Img

class Omnibus(Img2Img,Txt2Img):
    def __init__(self, model, precision):
        super().__init__(model, precision)

    def get_make_image(
            self,
            prompt,
            sampler,
            steps,
            cfg_scale,
            ddim_eta,
            conditioning,
            width,
            height,
            init_image = None,
            mask_image = None,
            strength = None,
            step_callback=None,
            threshold=0.0,
            perlin=0.0,
            **kwargs):
        """
        Returns a function returning an image derived from the prompt and the initial image
        Return value depends on the seed at the time you call it.
        """
        self.perlin = perlin

        sampler.make_schedule(
            ddim_num_steps=steps, ddim_eta=ddim_eta, verbose=False
        )

        if isinstance(init_image, Image.Image):
            init_image = self._image_to_tensor(init_image)

        if isinstance(mask_image, Image.Image):
            mask_image = self._image_to_tensor(mask_image,normalize=False)

        t_enc = steps

        if init_image is not None and mask_image is not None: # inpainting
            masked_image = init_image * (1 - mask_image)  # masked image is the image masked by mask - masked regions zero
            
        elif init_image is not None: # img2img
            scope = choose_autocast(self.precision)
            with scope(self.model.device.type):
                self.init_latent = self.model.get_first_stage_encoding(
                    self.model.encode_first_stage(init_image)
                ) # move to latent space
            # create a completely black mask  (1s)
            mask_image = torch.ones(init_image.shape[0], 3, init_image.width, init_image.height, device=self.model.device)
            # and the masked image is just a copy of the original
            masked_image = init_image
            t_enc = int(strength * steps)

        else: # txt2img
            mask_image = torch.zeros(init_image.shape[0], 3, init_image.width, init_image.height, device=self.model.device)
            masked_image = mask_image

        model = self.model

        def make_image(x_T):
            with torch.no_grad():
                with torch.autocast("cuda"):

                    batch = self.make_batch_sd(
                        init_image,
                        mask_image,
                        masked_image,
                        prompt=prompt,
                        device=model.device,
                        num_samples=1
                    )
                    
                    c = model.cond_stage_model.encode(batch["txt"])

                    c_cat = list()
                    for ck in model.concat_keys:
                        cc = batch[ck].float()
                        if ck != model.masked_image_key:
                            bchw = [num_samples, 4, h//8, w//8]
                            cc = torch.nn.functional.interpolate(cc, size=bchw[-2:])
                        else:
                            cc = model.get_first_stage_encoding(model.encode_first_stage(cc))
                        c_cat.append(cc)
                    c_cat = torch.cat(c_cat, dim=1)

                    # cond
                    cond={"c_concat": [c_cat], "c_crossattn": [c]}

                    # uncond cond
                    uc_cross = model.get_unconditional_conditioning(num_samples, "")
                    uc_full = {"c_concat": [c_cat], "c_crossattn": [uc_cross]}
                    shape = [model.channels, h//8, w//8]
                    
                    samples, = sampler.sample(
                        batch_size = 1,
                        S = t_enc,
                        x_T = x_T,
                        conditioning = cond,
                        shape = shape,
                        verbose = False,
                        unconditional_guidance_scale = cfg_scale,
                        unconditional_conditioning = uc_full,
                        eta = 1.0,
                        img_callback = step_callback,
                        threshold = threshold,
                    )
                    if self.free_gpu_mem:
                        self.model.model.to("cpu")
            return self.sample_to_image(samples)

        return make_image

    def make_batch_sd(
            image,
            mask,
            masked_image,
            prompt,
            device,
            num_samples=1):
        batch = {
                "image": repeat(image.to(device=device), "1 ... -> n ...", n=num_samples),
                "txt": num_samples * [prompt],
                "mask": repeat(mask.to(device=device), "1 ... -> n ...", n=num_samples),
                "masked_image": repeat(masked_image.to(device=device), "1 ... -> n ...", n=num_samples),
                }
        return batch

    def get_noise(self, width:int, height:int):
        if self.init_latent:
            print('DEBUG: returning Img2Img.getnoise()')
            return super(Img2Img,self).get_noise(width,height)
        else:
            print('DEBUG: returning Txt2Img.getnoise()')
            return super(Txt2Img,self).get_noise(width,height)
