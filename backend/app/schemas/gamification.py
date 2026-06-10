from pydantic import BaseModel


class AchievementView(BaseModel):
    slug: str
    title: str
    description: str
    icon: str
    category: str
    unlocked: bool
    unlocked_at: str | None = None
    progress: float = 0.0
    current: int = 0
    threshold: int = 0


class GamificationProfile(BaseModel):
    xp_total: int
    level: int
    level_xp_into: int
    level_xp_span: int
    next_level: int
    achievements_unlocked: int
    achievements_total: int
    achievements: list[AchievementView]
