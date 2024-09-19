# Largely based on https://github.com/city96/ComfyUI-GGUF

from contextlib import contextmanager
from typing import Generator, Optional

import wrapt
from torch import Tensor, bfloat16, dtype, float16, nn

from invokeai.backend.quantization.gguf.layers import GGUFLayer


class TorchPatcher:
    @classmethod
    @contextmanager
    def wrap(cls) -> Generator[None, None, None]:
        # Dictionary to store original torch.nn classes for later restoration
        original_classes = {}
        try:
            # Iterate over _patcher's attributes and replace matching torch.nn classes
            for attr_name in dir(cls):
                if attr_name.startswith("__"):
                    continue
                # Get the class from _patcher
                patcher_class = getattr(cls, attr_name)

                # Check if torch.nn has a class with the same name
                if hasattr(nn, attr_name):
                    # Get the original torch.nn class
                    original_class = getattr(nn, attr_name)

                    # Define a helper function to bind the current patcher_attr for each iteration
                    def create_patch_function(patcher_attr):
                        # Return a new patch_class function specific to this patcher_attr
                        @wrapt.decorator
                        def patch_class(wrapped, instance, args, kwargs):
                            # Call the _patcher version of the class
                            return patcher_attr(*args, **kwargs)

                        return patch_class

                    # Save the original class for restoration later
                    original_classes[attr_name] = original_class

                    # Apply the patch
                    setattr(nn, attr_name, create_patch_function(patcher_class)(original_class))
            yield
        finally:
            # Restore the original torch.nn classes
            for attr_name, original_class in original_classes.items():
                setattr(nn, attr_name, original_class)


class GGUFPatcher(TorchPatcher):
    """
    Dequantize weights on the fly before doing the compute
    """

    class Linear(GGUFLayer, nn.Linear):
        def forward(self, input: Tensor) -> Tensor:
            weight, bias = self.cast_bias_weight(input)
            return nn.functional.linear(input, weight, bias)

    class Conv2d(GGUFLayer, nn.Conv2d):
        def forward(self, input: Tensor) -> Tensor:
            weight, bias = self.cast_bias_weight(input)
            return self._conv_forward(input, weight, bias)

    class Embedding(GGUFLayer, nn.Embedding):
        def forward(self, input: Tensor, out_dtype: Optional[dtype] = None) -> Tensor:
            output_dtype = out_dtype
            if not self.weight:
                raise ValueError("Embedding layer must have a weight")
            if self.weight.dtype == float16 or self.weight.dtype == bfloat16:
                out_dtype = None
            weight, _ = self.cast_bias_weight(input, device=input.device, dtype=out_dtype)
            return nn.functional.embedding(
                input, weight, self.padding_idx, self.max_norm, self.norm_type, self.scale_grad_by_freq, self.sparse
            ).to(dtype=output_dtype)

    class LayerNorm(GGUFLayer, nn.LayerNorm):
        def forward(self, input: Tensor) -> Tensor:
            if self.weight is None:
                return nn.functional.layer_norm(input, self.normalized_shape, None, None, self.eps)
            weight, bias = self.cast_bias_weight(input)
            return nn.functional.layer_norm(input, self.normalized_shape, weight, bias, self.eps)

    class GroupNorm(GGUFLayer, nn.GroupNorm):
        def forward(self, input: Tensor) -> Tensor:
            weight, bias = self.cast_bias_weight(input)
            return nn.functional.group_norm(input, self.num_groups, weight, bias, self.eps)
