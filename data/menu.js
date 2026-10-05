/**
 * 这个文件由 server/export_menu.py 自动生成，不要手动改。
 * 数据源是 server/menu.py，改完菜单运行：
 *     python server/export_menu.py
 */

const menuInfo = {
  "shopName": "小厨单",
  "slogan": "每天都要好好吃饭",
  "avatarEmoji": "🍳",
  "avatarImg": "/images/avatar.jpg",
  "cover": "/images/cover.jpg",
  "lower": "/images/lower.jpg",
  "since": "0",
  "notice": "",
  "contact": "",
  "intro": ""
}

const categories = [
  {
    "id": "hot",
    "name": "热菜"
  },
  {
    "id": "cold",
    "name": "凉菜"
  },
  {
    "id": "staple",
    "name": "主食"
  },
  {
    "id": "soup",
    "name": "汤羹"
  },
  {
    "id": "drink",
    "name": "饮品"
  }
]

const dishes = []

function getDishById(id) {
  const key = String(id)
  for (let i = 0; i < dishes.length; i++) {
    if (String(dishes[i].id) === key) return dishes[i]
  }
  return null
}

module.exports = {
  menuInfo: menuInfo,
  categories: categories,
  dishes: dishes,
  getDishById: getDishById
}
