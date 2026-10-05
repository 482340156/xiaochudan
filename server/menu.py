"""菜单数据 —— 整个项目的唯一数据源。

改菜单只需要改这个文件：店名、菜品、价格、食材、做法。
改完重启服务就生效；想同步给微信小程序，运行
`python server/export_menu.py` 重新生成小程序的 data/menu.js。
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(BASE_DIR, "data")
IMAGES_DIR = os.path.join(PROJECT_DIR, "images")
# 店主在后台自己加的菜存在这里（export_menu.py 不会覆盖它）
EXTRA_FILE = os.path.join(DATA_DIR, "dishes.json")

SHOP = {
    "name": "小厨单",
    "slogan": "每天都要好好吃饭",
    "avatar": "🍳",
    # 小图标图片。留空会自动去找 images/avatar.jpg
    "avatar_img": "",
    # 年份。填什么就显示什么；想完全不显示就改成 ""
    "since": "0",
    # 公告和简介：留空就不显示
    "notice": "",
    "intro": "",
    # 联系方式。建议放在 config_local.py 里，避免上传到 GitHub
    "contact": "",
    # 封面图。留空会自动去找 images/cover.jpg（png / webp 也行）
    "cover": "",
    # 下半部分的背景图。留空会自动去找 images/lower.jpg
    "lower": "",
    # 店主后台 /shop 的进入口令。建议放在 config_local.py 里
    "admin_token": "change-me",
}

# ---------------------------------------------------------------- 私有配置
#
# 联系方式、后台口令这类不想公开的信息，放在同目录的 config_local.py 里。
# 那个文件在 .gitignore 里，不会被上传到 GitHub。
# 没有这个文件也没关系，上面用的是安全的默认值。
try:
    from config_local import OVERRIDES as _LOCAL_OVERRIDES
except ImportError:
    _LOCAL_OVERRIDES = {}

if isinstance(_LOCAL_OVERRIDES, dict):
    SHOP.update({k: v for k, v in _LOCAL_OVERRIDES.items() if v not in (None, "")})

CATEGORIES = [
    {"id": "hot", "name": "热菜"},
    {"id": "cold", "name": "凉菜"},
    {"id": "staple", "name": "主食"},
    {"id": "soup", "name": "汤羹"},
    {"id": "drink", "name": "饮品"},
]

# 菜品列表。现在是空的 —— 菜都从店主后台加，存在 server/data/dishes.json。
# 想直接在代码里写菜，照 server/示例菜单_备份.py 的格式往这里加。
DISHES = []

# ---------------------------------------------------------------- 菜品数据层
#
# 菜品有两个来源：
#   1. 上面 DISHES 里写死的（改它 = 改代码）
#   2. server/data/dishes.json 里存的（店主在后台点出来的）
# all_dishes() 把两者合并，所以网页和小程序看到的都是完整的菜单。

# 后台新加的菜如果没指定颜色，就按这个色板轮流用
PALETTE = [
    ("#8FA9E8", "#DCE6FF"),
    ("#7FC8DE", "#D6F1F8"),
    ("#8FD3B6", "#DCF5EA"),
    ("#F2A6B8", "#FFE1E9"),
    ("#E8B08A", "#FFE9D8"),
    ("#B3A5E8", "#E8E2FF"),
    ("#7FBFC0", "#D8F0F0"),
    ("#E8A0C8", "#FFE0F0"),
    ("#C8C08F", "#F2EEDC"),
    ("#9DB8D8", "#E2EAF6"),
    ("#E8C07F", "#FFF0D8"),
    ("#A8B8C8", "#E6ECF2"),
]


def _as_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


COVER_NAMES = ("cover.jpg", "cover.jpeg", "cover.png", "cover.webp")
LOWER_NAMES = ("lower.jpg", "lower.jpeg", "lower.png", "lower.webp")
AVATAR_NAMES = ("avatar.jpg", "avatar.jpeg", "avatar.png", "avatar.webp")


def cover_image():
    """封面图地址。

    把图片存成  images/cover.jpg  就会自动用上；
    也可以在 SHOP 里写 "cover": "/images/xxx.jpg" 手动指定。
    没有图就返回空字符串，页面自动回到默认的浅色头部。
    """
    manual = (SHOP.get("cover") or "").strip()
    if manual:
        return manual
    for name in COVER_NAMES:
        if os.path.exists(os.path.join(IMAGES_DIR, name)):
            return "/images/" + name
    return ""


def lower_image():
    """下半部分（菜单区域）的背景图。

    把图片存成 images/lower.jpg 就会自动用上；
    也可以在 SHOP 里写 "lower": "/images/xxx.jpg" 手动指定。
    """
    manual = (SHOP.get("lower") or "").strip()
    if manual:
        return manual
    for name in LOWER_NAMES:
        if os.path.exists(os.path.join(IMAGES_DIR, name)):
            return "/images/" + name
    return ""


def avatar_image():
    """小图标图片。存成 images/avatar.jpg 就会自动替换掉 emoji 图标。"""
    manual = (SHOP.get("avatar_img") or "").strip()
    if manual:
        return manual
    for name in AVATAR_NAMES:
        if os.path.exists(os.path.join(IMAGES_DIR, name)):
            return "/images/" + name
    return ""


def extra_dishes():
    """读店主自己加的菜。文件坏了就当没有，不让服务起不来。"""
    if not os.path.exists(EXTRA_FILE):
        return []
    try:
        with open(EXTRA_FILE, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        return []
    if not isinstance(data, list):
        return []
    return [d for d in data if isinstance(d, dict)]


def _write_extra(items):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(EXTRA_FILE, "w", encoding="utf-8") as fh:
        json.dump(items, fh, ensure_ascii=False, indent=2)


def all_dishes():
    """完整菜单 = 代码里写死的 + 后台加的。"""
    return list(DISHES) + extra_dishes()


def next_dish_id():
    """给新菜分配编号，从 100 开始，避开写死的 1-99。"""
    used = {_as_int(d.get("id")) for d in all_dishes()}
    candidate = 100
    while candidate in used:
        candidate += 1
    return candidate


def get_dish(dish_id):
    """按 id 取一道菜，兼容字符串形式的 id。"""
    target = _as_int(dish_id, None)
    if target is None:
        return None
    for dish in all_dishes():
        if _as_int(dish.get("id")) == target:
            return dish
    return None


def is_custom(dish_id):
    """这道菜是后台加的（能删），还是代码里写死的（要改代码）。"""
    target = _as_int(dish_id, None)
    if target is None:
        return False
    return any(_as_int(d.get("id")) == target for d in extra_dishes())


def add_dish(fields, dish_id=None):
    """加一道菜并保存，返回这道菜的数据。"""
    items = extra_dishes()
    new_id = _as_int(dish_id, 0) or next_dish_id()
    dark, light = PALETTE[len(items) % len(PALETTE)]

    dish = {
        "id": new_id,
        "name": "",
        "category": CATEGORIES[0]["id"],
        "price": 0,
        "unit": "份",
        "emoji": "🍽️",
        "color": dark,
        "color2": light,
        "image": "",
        "recommend": False,
        "spicy": 0,
        "tags": [],
        "time": "",
        "level": "",
        "desc": "",
        "ingredients": [],
        "steps": [],
        "tips": "",
        "custom": True,
    }
    for key, value in (fields or {}).items():
        if key != "id":
            dish[key] = value
    dish["id"] = new_id

    items.append(dish)
    _write_extra(items)
    return dish


def delete_dish(dish_id):
    """删掉后台加的菜。代码里写死的菜删不掉，只能改 menu.py。"""
    target = _as_int(dish_id, None)
    if target is None:
        return False
    items = extra_dishes()
    kept = [d for d in items if _as_int(d.get("id")) != target]
    if len(kept) == len(items):
        return False
    _write_extra(kept)
    return True


def dishes_of(category=None, keyword=None):
    """按分类 / 关键词筛选菜品。"""
    result = all_dishes()
    if category and category != "all":
        result = [d for d in result if d.get("category") == category]
    if keyword:
        kw = keyword.strip().lower()
        result = [
            d
            for d in result
            if kw in d.get("name", "").lower()
            or kw in d.get("desc", "").lower()
            or any(kw in ing.lower() for ing in d.get("ingredients", []))
        ]
    return result


def recommended():
    """招牌推荐。"""
    return [d for d in all_dishes() if d.get("recommend")]
