import re
from collections import Counter
from typing import Iterable

import schemas


CATEGORY_RULES = {
    "AI 产品": ("产品", "用户", "需求", "场景", "体验", "工作流", "agent", "copilot", "saas"),
    "提示工程": ("prompt", "提示词", "system", "few-shot", "上下文", "指令", "角色设定"),
    "模型与技术": ("模型", "llm", "rag", "embedding", "向量", "微调", "训练", "推理", "token", "api"),
    "内容与创作": ("写作", "文章", "视频", "脚本", "设计", "创意", "内容", "故事", "视觉"),
    "研究与趋势": ("研究", "论文", "报告", "趋势", "数据", "实验", "观察", "benchmark"),
}

TAG_RULES = {
    "RAG": ("rag", "检索增强", "向量数据库"),
    "Agent": ("agent", "智能体", "工具调用"),
    "Prompt": ("prompt", "提示词", "指令"),
    "产品设计": ("产品", "需求", "用户体验", "交互"),
    "工作流": ("工作流", "自动化", "流程"),
    "多模态": ("图像", "视频", "语音", "多模态"),
    "研究": ("论文", "研究", "实验", "报告"),
}


def _contains_url(value: str) -> bool:
    return bool(re.search(r"https?://\S+", value, re.IGNORECASE))


def _infer_kind(content: str, source_url: str | None) -> str:
    lower = content.lower()
    if source_url or _contains_url(content):
        return "link"
    if any(token in lower for token in ("prompt:", "提示词", "system:", "你是一名", "请你")):
        return "prompt"
    if any(mark in content for mark in ("“", "”", "《", "> ")):
        return "quote"
    if len(content) <= 80:
        return "idea"
    return "note"


def _best_category(text: str) -> tuple[str, list[str]]:
    scores = Counter()
    hits: dict[str, list[str]] = {}
    lower = text.lower()
    for category, keywords in CATEGORY_RULES.items():
        matched = [keyword for keyword in keywords if keyword.lower() in lower]
        if matched:
            scores[category] = len(matched)
            hits[category] = matched
    if not scores:
        return "待整理", []
    category, _ = scores.most_common(1)[0]
    return category, hits[category]


def _tags(text: str, category: str) -> list[str]:
    lower = text.lower()
    tags = [tag for tag, keywords in TAG_RULES.items() if any(k.lower() in lower for k in keywords)]
    if category != "待整理" and category not in tags:
        tags.insert(0, category)
    return tags[:4]


def _summary(content: str) -> str:
    compact = re.sub(r"\s+", " ", content).strip()
    if len(compact) <= 92:
        return compact
    sentence = re.split(r"(?<=[。！？.!?])\s*", compact)[0]
    return sentence[:92] if len(sentence) >= 24 else compact[:92] + "…"


def classify(content: str, title: str | None = None, source_url: str | None = None) -> schemas.KnowledgeClassification:
    text = " ".join(filter(None, (title, content)))
    category, hits = _best_category(text)
    kind = _infer_kind(content, source_url)
    tags = _tags(text, category)
    confidence = min(0.96, 0.55 + len(hits) * 0.1 + (0.08 if tags else 0))
    if not hits:
        confidence = 0.42
        reason = "暂未发现明确主题词，先放入待整理。"
    else:
        reason = f"识别到“{'、'.join(hits[:3])}”等主题词。"
    return schemas.KnowledgeClassification(
        kind=kind,
        category=category,
        tags=tags,
        summary=_summary(content),
        confidence=round(confidence, 2),
        reason=reason,
    )


def related_item_ids(item, candidates: Iterable, limit: int = 4) -> list[str]:
    item_tags = set(item.tags or [])
    scored = []
    for candidate in candidates:
        if candidate.id == item.id:
            continue
        shared = item_tags.intersection(candidate.tags or [])
        score = len(shared) * 2 + int(candidate.category == item.category)
        if score:
            scored.append((score, candidate.id))
    scored.sort(reverse=True)
    return [item_id for _, item_id in scored[:limit]]
