---
title: 'Cloudflare Tunnel 实现ssh穿透'
published: 2026-08-15
description: '家里的电脑或一台只有内网地址的小服务器，SSH 在局域网里可以正常使用，到了外网就会遇到动态公网 IP、NAT 和端口转发。Cloudflare Tunnel 的连接方向很干净：服务器上的 `cloudflared` 主动连向 Cloudflare，客户端完成身份校验后，再沿这条隧道访问 `localhost:22`。'
image: ''
tags: ["Cloudflare"]
draft: false
lang: 'zh-CN'
translationKey: 'cloudflare-tunnel-实现ssh穿透'
notionSync: true
notionPageId: '3bd4342e-b403-80b9-ac6d-c5e4cd3722dc'
category: '技术'
---


家里的电脑或一台只有内网地址的小服务器，SSH 在局域网里可以正常使用，到了外网就会遇到动态公网 IP、NAT 和端口转发。Cloudflare Tunnel 的连接方向很干净：服务器上的 `cloudflared` 主动连向 Cloudflare，客户端完成身份校验后，再沿这条隧道访问 `localhost:22`。


**服务器只需要出站联网，路由器无需向公网开放 TCP 22，源站 IP 也不会随着 SSH 域名直接暴露。**


![image.png](../assets/images/cloudflare-tunnel-实现ssh穿透/image-1.png)


本文采用“客户端安装 `cloudflared`”的方案，适合个人维护、临时登录和短时命令。Cloudflare 官方说明，这条路径会把 SSH 流量放进 WebSocket；Remote SSH、持续文件传输和其他长连接场景，更适合 WARP/Client-to-Tunnel 或 Access for Infrastructure。


## 22 端口先在本机可用


Tunnel 只负责搬运流量，无法替服务器安装或修复 SSH。配置前先在服务器上确认 `sshd` 已运行，并且本机能够登录。


建议先配置 SSH 密钥，并确认密钥登录成功。云服务器还要准备控制台或其他恢复通道，避免修改防火墙后把自己锁在门外。


## 隧道由服务器主动连出去


进入 Cloudflare Dashboard 的 `Networking → Tunnels`，创建一个 `cloudflared` Tunnel


![image.png](../assets/images/cloudflare-tunnel-实现ssh穿透/image-2.png)


选择服务器操作系统后，后台会生成安装命令，直接在服务器的管理员终端执行。远程管理 Tunnel 时，命令形式大致如下：


```plain text
# Linux
sudo cloudflared service install <TUNNEL_TOKEN>

# Windows 管理员终端
cloudflared.exe service install <TUNNEL_TOKEN>
```


**Tunnel token 等同于隧道凭据，不能写进文章、截图、Git 仓库或聊天记录。** 泄露后应立即在 Cloudflare 后台轮换。


等 Tunnel 状态变成 `Active`，打开它的 `Routes` 页面，选择 `Add route → Published application`，填写：

- Hostname：`ssh.example.com`（你要使用的域名）
- Service：`SSH`
- 地址：`localhost:22`

如果 `cloudflared` 和 SSH 服务位于两台机器，地址改为 SSH 服务器的内网地址，例如 `192.168.1.20:22`。保存后，Cloudflare 会把这个主机名指向 Tunnel。


## Access 和 SSH 密钥各守一道门（可选）


发布 SSH 路由后，还应在 `Zero Trust → Access controls → Applications` 创建一个 `Self-hosted and private` 应用，主机名填写同一个 `ssh.example.com`。Allow 策略只放行自己的账号或指定身份组；身份提供商支持 MFA 时，把 MFA 也纳入策略。


**Access 与 SSH 登录是两次独立判断。** Access 决定一条连接能否抵达服务器，`sshd` 继续核对系统用户名和 SSH 密钥。只配 Access 不能替代密钥认证，只配密钥也少了 Cloudflare 入口处的身份限制。


确认 Tunnel 登录可用并保留恢复通道后，再关闭路由器端口转发或云安全组中的公网 22 入站规则。`cloudflared` 与 `sshd` 在同一台机器时，可以把 22 端口限制在本机或可信内网范围。


## 客户端用 ProxyCommand 接入


客户端同样需要安装 `cloudflared`，并确认下面的命令能输出版本号：


```plain text
cloudflared --version
```


编辑 SSH 配置。Windows OpenSSH 使用 `C:\Users\<用户名>\.ssh\config`，Linux 和 macOS 使用 `~/.ssh/config`：


```plain text
Host home-ssh
  HostName ssh.example.com
  User ubuntu
  ProxyCommand cloudflared access ssh --hostname %h
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
```


运行 `ssh home-ssh`。首次连接会拉起浏览器完成 Access 登录（如果配了Access ），通过后终端继续执行 SSH 密钥校验。Windows 找不到 `cloudflared` 时，可用 `where.exe cloudflared` 查到路径，再把 `ProxyCommand` 中的程序名换成完整路径。


连不上时按链路顺序排查：Dashboard 中 Tunnel 是否为 `Active`；服务器本机能否连接 22 端口；Tunnel 路由与 Access 应用的主机名是否完全一致；客户端能否找到 `cloudflared`。最后运行 `ssh -vvv home-ssh`，日志会显示问题停在 ProxyCommand、Access 还是 SSH 握手。


**需要数小时保持在线、频繁使用 VS Code Remote SSH 或传输大文件时，优先采用 WARP/Client-to-Tunnel 或 Access for Infrastructure。** 本文这套方案胜在部署轻、客户端仍使用原生 `ssh` 命令，适合个人设备的日常维护。


## 参考资料

- [Cloudflare：Connect to SSH with client-side cloudflared](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/ssh/ssh-cloudflared-authentication/)
- [Cloudflare：Create a remotely-managed tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)
- [Cloudflare：Tunnel supported protocols](https://developers.cloudflare.com/tunnel/routing/)
- [Cloudflare：Add a self-hosted application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
