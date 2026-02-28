from mlx_lm import load, generate
from typing import Optional
from app.core.state import server_state

_model = None
_tokenizer = None
_current_model_name = None


def get_model(model_name: str):
    global _model, _tokenizer, _current_model_name
    if _current_model_name != model_name:
        server_state.set_loading(model_name)
        _model, _tokenizer = load(model_name)
        _current_model_name = model_name
        server_state.set_idle()
    return _model, _tokenizer


def chat(model_name: str, system_prompt: Optional[str], question: str, session_id: int = 0) -> str:
    server_state.increment_queue()
    try:
        model, tokenizer = get_model(model_name)
        server_state.decrement_queue()
        server_state.set_inferring(session_id, question)

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
    finally:
        server_state.set_idle()
