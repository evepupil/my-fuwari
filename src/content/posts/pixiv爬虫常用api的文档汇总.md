---
title: 'Pixiv爬虫常用API的文档汇总'
published: 2025-10-08
description: '开发 Pixiv 爬虫的过程中，我深入研究了 Pixiv 的各种 API 接口。本文将基于实际的爬虫实现，详细介绍 Pixiv 的主要 API 接口、请求格式以及返回数据结构，希望能为其他开发者提供参考。'
image: ''
tags: ["爬虫", "pixiv", "好玩"]
draft: false
lang: ''
category: '技术'
---


## 前言


开发 Pixiv 爬虫的过程中，我深入研究了 Pixiv 的各种 API 接口。本文将基于实际的爬虫实现，详细介绍 Pixiv 的主要 API 接口、请求格式以及返回数据结构，希望能为其他开发者提供参考。


前阵子开发了一个serverless的pixiv爬虫：


[Pixiv爬虫/下载/代理，无需服务器即可一键部署！]([https://blog.chaosyn.com/posts/pixiv爬虫-下载-代理-无需服务器即可一键部署/](https://blog.chaosyn.com/posts/pixiv%E7%88%AC%E8%99%AB-%E4%B8%8B%E8%BD%BD-%E4%BB%A3%E7%90%86-%E6%97%A0%E9%9C%80%E6%9C%8D%E5%8A%A1%E5%99%A8%E5%8D%B3%E5%8F%AF%E4%B8%80%E9%94%AE%E9%83%A8%E7%BD%B2/))


使用示例项目地址：


https://github.com/evepupil/serverless_pixiv_crawlergithub.com/evepupil/serverless_pixiv_crawler


## 基础配置


### 请求头设置


所有 API 请求都需要正确的请求头，特别是 Cookie 和 User-Agent：


```plain text
interface PixivHeaders {
  'User-Agent': string;
  cookie: string;
  Referer: string;
  'Accept-Language': string;
}
```


### 通用响应格式


Pixiv API 的响应通常遵循以下格式：


```plain text
{
  "error": false,
  "body": {
    // 具体数据
  }
}
```


## 核心 API 接口详解


### 1. 获取插画详细信息


**接口地址：** https://www.pixiv.net/ajax/illust/{pid}


**请求方式：** GET


**参数说明：**

- pid: 插画ID（必需）

**返回数据结构：**


```plain text
interface PixivIllustInfo {
  body: {
    userId: string;          // 作者用户ID
    title: string;           // 插画标题
    userName: string;        // 作者用户名
    tags: {
      tags: Array<{
        tag: string;         // 标签名
        translation?: {
          en: string;        // 英文翻译
        };
      }>;
    };
    likeCount: number;       // 点赞数
    bookmarkCount: number;   // 收藏数
    viewCount: number;       // 浏览数
    illusts?: Array<{ id: string }>; // 相关插画
    recommendUsers?: Array<{
      userId: string;
      illustIds: string[];
    }>;
  };
  error: boolean;
}
```


**使用示例：**


```plain text
const response = await axios.get(
  `https://www.pixiv.net/ajax/illust/123456789`,
  { headers: pixivHeaders }
);
const illustInfo: PixivIllustInfo = response.data;
```


### 2. 获取插画页面信息（图片链接）


**接口地址：** https://www.pixiv.net/ajax/illust/{pid}/pages?lang=zh


**请求方式：** GET


**参数说明：**

- pid: 插画ID（必需）
- lang: 语言设置，默认为 zh

**返回数据结构：**


```plain text
interface PixivIllustPagesResponse {
  body: Array<{
    urls: {
      original: string;      // 原图链接
      regular: string;       // 常规尺寸
      small: string;         // 小尺寸
      thumb_mini: string;    // 缩略图
    };
  }>;
  error: boolean;
}
```


**使用示例：**


```plain text
const response = await axios.get(
  `https://www.pixiv.net/ajax/illust/123456789/pages?lang=zh`,
  { headers: pixivHeaders }
);
const pagesInfo: PixivIllustPagesResponse = response.data;
```


### 3. 获取插画推荐列表


**接口地址：** https://www.pixiv.net/ajax/illust/{pid}/recommend/init?limit=30&lang=zh


**请求方式：** GET


**参数说明：**

- pid: 插画ID（必需）
- limit: 返回数量限制，默认30
- lang: 语言设置，默认为 zh

**返回数据结构：**


```plain text
interface PixivRecommendResponse {
  body: {
    illusts: Array<{ id: string }>; // 推荐插画ID列表
  };
  error: boolean;
}
```


**使用示例：**


```plain text
const response = await axios.get(
  `https://www.pixiv.net/ajax/illust/123456789/recommend/init?limit=30&lang=zh`,
  { headers: pixivHeaders }
);
const recommendInfo: PixivRecommendResponse = response.data;
```


### 4. 获取用户推荐


**接口地址：** https://www.pixiv.net/ajax/user/{userId}/recommends?userNum=30&workNum=5&isR18=false&lang=zh


**请求方式：** GET


**参数说明：**

- userId: 用户ID（必需）
- userNum: 推荐用户数量，默认30
- workNum: 每个用户的作品数量，默认5
- isR18: 是否包含R18内容，默认false
- lang: 语言设置，默认为 zh

**返回数据结构：**


```plain text
interface PixivUserRecommendResponse {
  body: {
    recommendUsers: Array<{
      userId: string;        // 推荐用户ID
      illustIds: string[];   // 该用户的插画ID列表
    }>;
  };
  error: boolean;
}
```


**使用示例：**


```plain text
const response = await axios.get(
  `https://www.pixiv.net/ajax/user/123456/recommends?userNum=30&workNum=5&isR18=false&lang=zh`,
  { headers: pixivHeaders }
);
const userRecommendInfo: PixivUserRecommendResponse = response.data;
```


## 排行榜接口


### 获取排行榜数据


**接口地址：** https://www.pixiv.net/ranking.php?mode={mode}&content=illust


**请求方式：** GET


**参数说明：**

- mode: 排行榜类型
- daily: 日榜
- weekly: 周榜
- monthly: 月榜
- content: 内容类型，固定为 illust

**注意：** 这个接口返回的是 HTML 页面，需要通过正则表达式解析获取插画ID。


**解析示例：**


```plain text
// 提取插画ID的正则表达式
const pidRegex = /<a\s+[^>]*href=["']\/artworks\/(\d+)["'][^>]*>/g;
const pids: string[] = [];
let match: RegExpExecArray | null;

while ((match = pidRegex.exec(html)) !== null) {
  pids.push(match[1]);
}
```


## 首页推荐接口


### 获取首页推荐内容


**接口地址：** https://www.pixiv.net/


**请求方式：** GET


**说明：** 首页推荐也是通过解析 HTML 页面获取，需要查找包含 data-gtm-work-id 属性的元素。


**解析示例：**


```plain text
// 提取推荐插画ID的正则表达式
const pidRegex = /data-gtm-work-id=["'](\d+)["']/gi;
const pids: string[] = [];
let match: RegExpExecArray | null;

while ((match = pidRegex.exec(html)) !== null) {
  pids.push(match[1]);
}
```


## 错误处理


### 常见错误类型

1. **404 错误**：插画不存在或已被删除
2. **403 错误**：权限不足或需要登录
3. **429 错误**：请求过于频繁，需要限流

### 错误处理示例


```plain text
try {
  const response = await axios.get(apiUrl, { headers });
  return response.data;
} catch (error) {
  if (error.response?.status === 404) {
    console.log('插画不存在');
    return { error: true, status: 404, message: 'Image not found' };
  }
  throw error;
}
```


## 最佳实践


### 1. 请求频率控制


```plain text
// 添加随机延迟避免被封
const delay = Math.random() * 2000 + 1000; // 1-3秒随机延迟
await new Promise(resolve => setTimeout(resolve, delay));
```


### 2. 请求头轮换


```plain text
// 使用多个不同的请求头轮换使用
const headersList: PixivHeaders[] = [
  { /* 请求头1 */ },
  { /* 请求头2 */ },
  { /* 请求头3 */ }
];

let headerIndex = 0;
const currentHeaders = headersList[headerIndex % headersList.length];
headerIndex++;
```


### 3. 重试机制


```plain text
async function requestWithRetry(url: string, maxRetries: number = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```


## 总结


本文基于实际的爬虫项目，详细介绍了 Pixiv 的主要 API 接口。这些接口涵盖了：

1. **插画信息获取**：基础信息、页面信息、推荐列表
2. **用户相关**：用户推荐、作者信息
3. **排行榜数据**：日榜、周榜、月榜
4. **首页推荐**：个性化推荐内容

在使用这些接口时，请注意：

- 遵守网站的使用条款
- 控制请求频率，避免对服务器造成压力
- 正确处理各种错误情况
- 使用合适的请求头和认证信息

希望这份文档能够帮助到需要了解 Pixiv API 的开发者们！


---


_注：本文仅供学习交流使用，请遵守相关法律法规和网站使用条款。_


![v2-3052331952cbe0c11d5404c6d4b7ff26_r.jpg](../assets/images/pixiv爬虫常用api的文档汇总/image-1.jpg)

