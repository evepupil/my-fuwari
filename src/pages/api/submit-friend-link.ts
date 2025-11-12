import type { APIRoute } from 'astro';
import { Client } from '@notionhq/client';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, url, description, avatar } = body;

    // 验证必填字段
    if (!name || !url || !description || !avatar) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '请填写所有必填字段'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证 URL 格式
    try {
      new URL(url);
      new URL(avatar);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'URL 格式不正确'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取环境变量
    const notionToken = import.meta.env.NOTION_TOKEN;
    const notionFriendLinkDatabaseId = import.meta.env.NOTION_FRIEND_LINK_DATABASE_ID;

    if (!notionToken || !notionFriendLinkDatabaseId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '服务配置错误，请联系管理员'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 初始化 Notion 客户端
    const notion = new Client({ auth: notionToken });

    // 创建 Notion 页面
    await notion.pages.create({
      parent: {
        database_id: notionFriendLinkDatabaseId,
      },
      properties: {
        '网站名称': {
          title: [
            {
              text: {
                content: name,
              },
            },
          ],
        },
        '网站地址': {
          url: url,
        },
        '网站描述': {
          rich_text: [
            {
              text: {
                content: description,
              },
            },
          ],
        },
        '头像URL': {
          url: avatar,
        },
        '状态': {
          select: {
            name: '待审核',
          },
        },
        '提交时间': {
          date: {
            start: new Date().toISOString(),
          },
        },
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: '友链申请已提交，等待审核'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('友链提交失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: '提交失败，请稍后重试'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
