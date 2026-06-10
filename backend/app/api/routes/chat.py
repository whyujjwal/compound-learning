from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.dependencies import get_client_timezone, get_current_user
from app.models.chat import Conversation, Message
from app.models.user import User
from app.schemas.chat import (
    AIStatus,
    CoachInsightResponse,
    ConversationDetail,
    ConversationSummary,
    CreateConversationRequest,
    MessageResponse,
    SendMessageRequest,
    SendMessageResponse,
)
from app.services.ai_service import AIDisabled, chat_completion
from app.services.coach_insights import get_or_create_daily, get_or_create_weekly

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/status", response_model=AIStatus)
def ai_status() -> AIStatus:
    model = settings.ai_model if settings.ai_enabled else "stats-fallback"
    return AIStatus(enabled=True, provider=settings.ai_provider, model=model)


@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ConversationSummary]:
    rows = (
        db.query(
            Conversation,
            func.count(Message.id).label("msg_count"),
        )
        .outerjoin(Message, Message.conversation_id == Conversation.id)
        .filter(Conversation.user_id == user.id)
        .group_by(Conversation.id)
        .order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        ConversationSummary(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=count,
        )
        for conv, count in rows
    ]


@router.post("/conversations", response_model=ConversationDetail, status_code=201)
def create_conversation(
    payload: CreateConversationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ConversationDetail:
    conv = Conversation(user_id=user.id, title=payload.title or "New conversation")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[],
    )


@router.get("/conversations/{conv_id}", response_model=ConversationDetail)
def get_conversation(
    conv_id: UUID,
    message_limit: int = Query(default=200, ge=1, le=500),
    message_offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ConversationDetail:
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conv_id, Conversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .offset(message_offset)
        .limit(message_limit)
        .all()
    )
    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[MessageResponse.model_validate(m) for m in messages],
    )


@router.delete("/conversations/{conv_id}", status_code=204)
def delete_conversation(
    conv_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conv_id, Conversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()


@router.post("/conversations/{conv_id}/messages", response_model=SendMessageResponse)
def send_message(
    conv_id: UUID,
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SendMessageResponse:
    conv = (
        db.query(Conversation)
        .options(joinedload(Conversation.messages))
        .filter(Conversation.id == conv_id, Conversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        user_msg, assistant_msg = chat_completion(db, user, conv, payload.content)
    except AIDisabled as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI request failed: {e}")

    return SendMessageResponse(
        user_message=MessageResponse.model_validate(user_msg),
        assistant_message=MessageResponse.model_validate(assistant_msg),
        conversation_title=conv.title,
    )


def _insight_to_response(insight) -> CoachInsightResponse:
    return CoachInsightResponse(
        kind=insight.kind.value if hasattr(insight.kind, "value") else str(insight.kind),
        period_key=insight.period_key,
        content=insight.content,
        metrics=insight.metrics,
        provider=insight.provider,
        model=insight.model,
        generated_at=insight.generated_at,
    )


@router.get("/insights/daily", response_model=CoachInsightResponse)
def daily_insight(
    refresh: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    timezone_name: str = Depends(get_client_timezone),
) -> CoachInsightResponse:
    try:
        insight = get_or_create_daily(db, user, refresh=refresh, timezone_name=timezone_name)
    except AIDisabled as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Daily insight failed: {e}")
    return _insight_to_response(insight)


@router.get("/insights/weekly", response_model=CoachInsightResponse)
def weekly_insight(
    refresh: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    timezone_name: str = Depends(get_client_timezone),
) -> CoachInsightResponse:
    try:
        insight = get_or_create_weekly(db, user, refresh=refresh, timezone_name=timezone_name)
    except AIDisabled as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weekly insight failed: {e}")
    return _insight_to_response(insight)
