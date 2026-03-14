from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.db.database import get_db
from app.models.base import (
    Workflow, WorkflowQuestion, Poc, Model, SystemPrompt,
    ConversationLog, User
)
from app.core.auth import get_current_user
from app.core.llm import chat_stream

router = APIRouter(prefix="/workflows", tags=["workflows"])


# ---------- スキーマ ----------

class WorkflowQuestionIn(BaseModel):
    order_index: int
    question: str
    expected_answer: Optional[str] = None

class WorkflowCreate(BaseModel):
    poc_id: int
    name: str
    system_prompt_id: Optional[int] = None
    questions: List[WorkflowQuestionIn]

class WorkflowQuestionUpdate(BaseModel):
    order_index: Optional[int] = None
    question: Optional[str] = None
    expected_answer: Optional[str] = None

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt_id: Optional[int] = None
    questions: Optional[List[WorkflowQuestionIn]] = None


# ---------- ヘルパー ----------

def _workflow_dict(wf: Workflow, questions: list) -> dict:
    return {
        "id": wf.id,
        "poc_id": wf.poc_id,
        "name": wf.name,
        "system_prompt_id": wf.system_prompt_id,
        "status": wf.status,
        "created_by": wf.created_by,
        "created_at": wf.created_at,
        "executed_at": wf.executed_at,
        "questions": [
            {
                "id": q.id,
                "order_index": q.order_index,
                "question": q.question,
                "expected_answer": q.expected_answer,
                "log_id": q.log_id,
                "status": q.status,
            }
            for q in sorted(questions, key=lambda x: x.order_index)
        ],
    }


def _run_workflow(workflow_id: int, db_url: str):
    """バックグラウンドで逐次実行する"""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not wf:
            return

        poc = db.query(Poc).filter(Poc.id == wf.poc_id).first()
        model = db.query(Model).filter(Model.id == poc.model_id).first() if poc else None
        if not poc or not model:
            wf.status = 4  # error
            db.commit()
            return

        system_prompt_content = None
        if wf.system_prompt_id:
            sp = db.query(SystemPrompt).filter(SystemPrompt.id == wf.system_prompt_id).first()
            system_prompt_content = sp.content if sp else None

        # ワークフロー用セッションを取得（pocごとの固定セッション）
        from app.models.base import Session as SessionModel
        session = db.query(SessionModel).filter(SessionModel.poc_id == poc.id).first()
        if not session:
            wf.status = 4
            db.commit()
            return

        wf.status = 2  # running
        wf.executed_at = datetime.now()
        db.commit()

        questions = db.query(WorkflowQuestion).filter(
            WorkflowQuestion.workflow_id == workflow_id
        ).order_by(WorkflowQuestion.order_index).all()

        model_path = model.base_model or model.model_name

        for q in questions:
            if q.status == 3:  # 既に完了済みはスキップ
                continue

            q.status = 2  # running
            db.commit()

            try:
                tokens = []
                for token in chat_stream(
                    model_name=model_path,
                    system_prompt=system_prompt_content,
                    question=q.question,
                    session_id=session.id,
                ):
                    tokens.append(token)

                answer = "".join(tokens)
                log = ConversationLog(
                    session_id=session.id,
                    type=2,  # ワークフロー
                    question=q.question,
                    answer=answer,
                    expected_answer=q.expected_answer,
                )
                db.add(log)
                db.flush()

                q.log_id = log.id
                q.status = 3  # done
                db.commit()

            except Exception:
                q.status = 4  # error
                db.commit()

        # 全問完了チェック
        all_questions = db.query(WorkflowQuestion).filter(
            WorkflowQuestion.workflow_id == workflow_id
        ).all()
        if any(q.status == 4 for q in all_questions):
            wf.status = 4  # error
        else:
            wf.status = 3  # done
        db.commit()

    except Exception:
        try:
            wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
            if wf:
                wf.status = 4
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


# ---------- エンドポイント ----------

@router.post("", status_code=status.HTTP_201_CREATED)
def create_workflow(
    wf_in: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == wf_in.poc_id).first()
    if not poc:
        raise HTTPException(status_code=404, detail="PoC not found")

    wf = Workflow(
        poc_id=wf_in.poc_id,
        name=wf_in.name,
        system_prompt_id=wf_in.system_prompt_id,
        status=1,
        created_by=current_user.id,
    )
    db.add(wf)
    db.flush()

    for q_in in wf_in.questions:
        q = WorkflowQuestion(
            workflow_id=wf.id,
            order_index=q_in.order_index,
            question=q_in.question,
            expected_answer=q_in.expected_answer,
        )
        db.add(q)

    db.commit()
    db.refresh(wf)

    questions = db.query(WorkflowQuestion).filter(
        WorkflowQuestion.workflow_id == wf.id
    ).all()
    return _workflow_dict(wf, questions)


@router.get("/poc/{poc_id}", status_code=status.HTTP_200_OK)
def list_workflows(
    poc_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    workflows = db.query(Workflow).filter(Workflow.poc_id == poc_id).order_by(
        Workflow.created_at.desc()
    ).all()
    result = []
    for wf in workflows:
        questions = db.query(WorkflowQuestion).filter(
            WorkflowQuestion.workflow_id == wf.id
        ).all()
        result.append(_workflow_dict(wf, questions))
    return result


@router.get("/{workflow_id}", status_code=status.HTTP_200_OK)
def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    questions = db.query(WorkflowQuestion).filter(
        WorkflowQuestion.workflow_id == workflow_id
    ).all()
    return _workflow_dict(wf, questions)


@router.put("/{workflow_id}", status_code=status.HTTP_200_OK)
def update_workflow(
    workflow_id: int,
    wf_in: WorkflowUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if wf.status == 2:
        raise HTTPException(status_code=400, detail="実行中のワークフローは編集できません")

    if wf_in.name is not None:
        wf.name = wf_in.name
    if wf_in.system_prompt_id is not None:
        wf.system_prompt_id = wf_in.system_prompt_id

    if wf_in.questions is not None:
        if wf.status in (3, 4):
            # 完了・エラー時は追加のみ（既存質問は変更不可）
            existing = db.query(WorkflowQuestion).filter(
                WorkflowQuestion.workflow_id == workflow_id
            ).all()
            existing_ids = {q.id for q in existing}
            max_order = max((q.order_index for q in existing), default=0)
            for q_in in wf_in.questions:
                if not hasattr(q_in, 'id') or q_in.id not in existing_ids:
                    max_order += 1
                    q = WorkflowQuestion(
                        workflow_id=wf.id,
                        order_index=max_order,
                        question=q_in.question,
                        expected_answer=q_in.expected_answer,
                    )
                    db.add(q)
            # 再実行可能にステータスをリセット
            wf.status = 1
        else:
            # 下書きは全置換
            db.query(WorkflowQuestion).filter(
                WorkflowQuestion.workflow_id == workflow_id
            ).delete()
            for q_in in wf_in.questions:
                q = WorkflowQuestion(
                    workflow_id=wf.id,
                    order_index=q_in.order_index,
                    question=q_in.question,
                    expected_answer=q_in.expected_answer,
                )
                db.add(q)

    db.commit()
    db.refresh(wf)
    questions = db.query(WorkflowQuestion).filter(
        WorkflowQuestion.workflow_id == workflow_id
    ).all()
    return _workflow_dict(wf, questions)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if wf.status == 2:
        raise HTTPException(status_code=400, detail="実行中のワークフローは削除できません")
    db.query(WorkflowQuestion).filter(
        WorkflowQuestion.workflow_id == workflow_id
    ).delete()
    db.delete(wf)
    db.commit()


@router.post("/{workflow_id}/execute", status_code=status.HTTP_200_OK)
def execute_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if wf.status == 2:
        raise HTTPException(status_code=400, detail="既に実行中です")

    questions = db.query(WorkflowQuestion).filter(
        WorkflowQuestion.workflow_id == workflow_id
    ).all()
    if not questions:
        raise HTTPException(status_code=400, detail="質問が登録されていません")

    poc = db.query(Poc).filter(Poc.id == wf.poc_id).first()
    if not poc or not poc.model_id:
        raise HTTPException(status_code=400, detail="PoC にモデルが設定されていません")

    import os
    db_url = os.getenv("DATABASE_URL")
    _run_workflow(workflow_id, db_url)

    # 実行後の最新データを返す
    db.expire_all()
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    questions = db.query(WorkflowQuestion).filter(
        WorkflowQuestion.workflow_id == workflow_id
    ).all()
    return _workflow_dict(wf, questions)
