from mlx_lm import load, generate
from mlx_lm.tokenizer_utils import TokenizerWrapper
from typing import Optional

_model = None
_tokenizer = None
_current_model_name = None

def get_model(model_name: str):
    global _model, _tokenizer, _current_model_name
    if _current_model_name != model_name:
        _model, _tokenizer = load(model_name)
        _current_model_name = model_name
    return _model, _tokenizer

def chat(model_name: str, system_prompt: Optional[str], question: str) -> str:
    model, tokenizer = get_model(model_name)

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": question})

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    response = generate(model, tokenizer, prompt=prompt, max_tokens=512, verbose=False)
    return response
