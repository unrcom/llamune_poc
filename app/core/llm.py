from mlx_lm import load, stream_generate
from typing import Optional, Generator
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


def chat_stream(
    model_name: str,
    system_prompt: Optional[str],
    question: str,
    session_id: int = 0,
    max_tokens: int = 512,
) -> Generator[str, None, None]:
    """
    トークンを逐次 yield するジェネレータ。
    全トークン消費後に set_idle() を呼ぶ。
    """
    server_state.increment_queue()
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
        add_generation_prompt=True,
    )

    try:
        for response in stream_generate(model, tokenizer, prompt=prompt, max_tokens=max_tokens):
            yield response.text
    finally:
        server_state.set_idle()
