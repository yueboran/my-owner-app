from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class UserCreate(BaseModel):
    email: str
    password: str
    username: str
    verificationCode: str

class SendCodeRequest(BaseModel):
    email: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    avatarUrl: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class RadarDimensions(BaseModel):
    concept: int = 0
    research: int = 0
    planning: int = 0
    extension: int = 0
    evaluation: int = 0

class RadarContributor(BaseModel):
    author: str
    avatarUrl: str

class RadarContributorsMap(BaseModel):
    concept: Optional[RadarContributor] = None
    research: Optional[RadarContributor] = None
    planning: Optional[RadarContributor] = None
    extension: Optional[RadarContributor] = None
    evaluation: Optional[RadarContributor] = None

class CoCreationEvent(BaseModel):
    date: str
    author: str
    authorRole: Optional[str] = None
    eventType: str
    content: str
    emoji: str

class CommentBase(BaseModel):
    author: str
    avatarUrl: Optional[str] = None
    title: Optional[str] = None
    content: str
    imageUrl: Optional[str] = None
    images: Optional[List[str]] = None
    type: Optional[str] = "comment"
    projectName: Optional[str] = None
    category: Optional[str] = None
    ratings: Optional[Dict[str, int]] = None
    customData: Optional[Dict[str, str]] = None
    bookmarked: Optional[bool] = False

class CommentCreate(CommentBase):
    pass

class CommentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    imageUrl: Optional[str] = None
    images: Optional[List[str]] = None
    type: Optional[str] = None
    projectName: Optional[str] = None
    category: Optional[str] = None
    ratings: Optional[Dict[str, int]] = None
    customData: Optional[Dict[str, str]] = None

class Comment(CommentBase):
    id: str
    timeAgo: str

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    coverImage: Optional[str] = None
    icon: str
    intro: str
    description: str
    auroraScore: float = 0.0
    radar: RadarDimensions
    radarContributors: Optional[Dict[str, Any]] = None
    ratingFields: Optional[List[str]] = None
    customInputs: Optional[List[Dict[str, str]]] = None
    tags: List[str] = []
    requireTitleField: Optional[bool] = False
    
    painPointCount: Optional[int] = 0
    inspirationSource: Optional[str] = None
    inspirationAuthor: Optional[str] = None
    inspirationAuthorRole: Optional[str] = None
    coCreationTimeline: Optional[List[Dict[str, Any]]] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    coverImage: Optional[str] = None
    icon: Optional[str] = None
    intro: Optional[str] = None
    description: Optional[str] = None
    radar: Optional[RadarDimensions] = None
    tags: Optional[List[str]] = None
    ratingFields: Optional[List[str]] = None
    customInputs: Optional[List[Dict[str, str]]] = None
    requireTitleField: Optional[bool] = None

class Project(ProjectBase):
    id: str
    commentsCount: int
    timeAgo: str
    hotness: str
    likes: int
    bookmarked: bool
    comments: Optional[List[Comment]] = None

    class Config:
        from_attributes = True

class PaginatedResponse(BaseModel):
    list: List[Any]
    total: int
    page: int
    limit: int

class FeedbackCreate(BaseModel):
    user_name: str
    content: str

class FeedbackResponse(BaseModel):
    id: str
    user_name: str
    content: str
    created_at: str

    class Config:
        from_attributes = True

class ApiResponse(BaseModel):
    code: int = 200
    message: str = "success"
    data: Any

class KnowledgeClassification(BaseModel):
    kind: str
    category: str
    tags: List[str] = []
    summary: str = ""
    confidence: float = 0.0
    reason: str = ""

class KnowledgeClassifyRequest(BaseModel):
    content: str
    title: Optional[str] = None
    source_url: Optional[str] = None

class KnowledgeItemCreate(KnowledgeClassifyRequest):
    kind: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: str = "inbox"

class KnowledgeItemUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    kind: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    favorite: Optional[bool] = None
    related_ids: Optional[List[str]] = None

class KnowledgeItem(BaseModel):
    id: str
    title: str
    content: str
    kind: str
    category: str
    tags: List[str] = []
    summary: str = ""
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    status: str
    confidence: float
    classification_reason: str = ""
    related_ids: List[str] = []
    favorite: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class ChatMessageItem(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessageItem]
    model: Optional[str] = "opencode-coder"
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    temperature: Optional[float] = 0.7
    system_prompt: Optional[str] = None

class ChatConfigTestRequest(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = "deepseek-chat"

