#!/usr/bin/env node

/**
 * Notion 友情链接同步脚本
 * 功能：
 * 1. 从 Notion 数据库获取友情链接数据
 * 2. 仅同步状态为 "已通过" 的链接
 * 3. 强制覆盖 src/data/friends.json
 * 4. 如果未配置数据库 ID，则跳过同步
 */

import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
if (!process.env.VERCEL && !process.env.CI) {
  dotenv.config({ path: '.env.local' });
  dotenv.config();
}

// 配置
const CONFIG = {
  notionToken: process.env.NOTION_TOKEN,
  notionFriendLinkDatabaseId: process.env.NOTION_FRIEND_LINK_DATABASE_ID,
  outputFile: path.join(process.cwd(), 'src/data/friends.json'),
};

/**
 * 主函数
 */
async function main() {
  console.log('🔗 Notion 友情链接同步脚本\n');

  // 检查是否配置了友情链接数据库 ID
  if (!CONFIG.notionFriendLinkDatabaseId ||
      CONFIG.notionFriendLinkDatabaseId === 'your_database_id_here' ||
      CONFIG.notionFriendLinkDatabaseId === 'your_friend_link_database_id_here') {
    console.log('⏭️  未配置 NOTION_FRIEND_LINK_DATABASE_ID，跳过友情链接同步');
    console.log('💡 如需同步友情链接，请在 .env.local 中添加 NOTION_FRIEND_LINK_DATABASE_ID\n');
    process.exit(0);
  }

  // 验证必要的环境变量
  if (!CONFIG.notionToken) {
    console.error('❌ 错误: 缺少 NOTION_TOKEN 环境变量');
    console.error('请确保 .env.local 文件包含:');
    console.error('  NOTION_TOKEN=your_token\n');
    process.exit(1);
  }

  console.log('配置信息:');
  console.log(`  Notion Database ID: ${CONFIG.notionFriendLinkDatabaseId}`);
  console.log(`  输出文件: ${CONFIG.outputFile}\n`);

  try {
    // 初始化 Notion 客户端
    const notion = new Client({ auth: CONFIG.notionToken });

    // 获取友情链接数据
    console.log('📥 从 Notion 获取友情链接...');
    const response = await notion.databases.query({
      database_id: CONFIG.notionFriendLinkDatabaseId,
      filter: {
        property: '状态',
        select: {
          equals: '已通过',
        },
      },
      sorts: [
        {
          property: '提交时间',
          direction: 'descending',
        },
      ],
    });

    console.log(`✅ 找到 ${response.results.length} 个已通过的友情链接`);

    // 转换数据格式
    const friends = response.results.map((page) => {
      const properties = page.properties;

      // 获取网站名称
      const name = properties['网站名称']?.title?.[0]?.plain_text || 'Untitled';

      // 获取网站地址
      const url = properties['网站地址']?.url || '';

      // 获取网站描述
      const description = properties['网站描述']?.rich_text?.[0]?.plain_text || '';

      // 获取头像URL
      const avatar = properties['头像URL']?.url || '';

      return {
        name: name,
        avatar: avatar,
        description: description,
        url: url,
      };
    });

    // 构建输出 JSON
    const output = {
      friends: friends,
    };

    // 写入文件
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(output, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(60));
    console.log('✅ 友情链接同步完成!');
    console.log(`\n📊 统计信息:`);
    console.log(`  - 成功同步: ${friends.length} 个链接`);

    if (friends.length > 0) {
      console.log('\n🔗 已同步的友情链接:');
      friends.forEach(({ name, url }) => {
        console.log(`  • ${name} - ${url}`);
      });
    }

    console.log(`\n💾 文件已保存至: ${CONFIG.outputFile}\n`);
  } catch (error) {
    console.error('\n❌ 同步失败:', error.message);
    if (error.code === 'object_not_found') {
      console.error('💡 提示: 请检查 NOTION_FRIEND_LINK_DATABASE_ID 是否正确');
      console.error('💡 提示: 请确保 Notion Integration 已添加到该数据库\n');
    } else if (error.code === 'unauthorized') {
      console.error('💡 提示: 请检查 NOTION_TOKEN 是否正确\n');
    } else {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行脚本
main();
