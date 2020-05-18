---
title: 'GaaS: GitHub as a Service'
excerpt: 'In the past years, GitHub became a technology mastodon. Since the acquisition by Microsoft, the company added a myriad of outstanding features. In fact, GitHub is so powerful nowadays that it can be your all-in-all provider. You can use GitHub as a Service. Don’t believe me? Let’s go through my journey building Request For Maintainers a GitHub-only powered project.'
timeStamp: '2020-05-18T17:53:20.107Z'
ogImage:
  url: '/papers/gaas.jpg'
---

In the past years, GitHub became a technology mastodon. Since the [acquisition by Microsoft](https://news.microsoft.com/2018/06/04/microsoft-to-acquire-github-for-7-5-billion/), the company added a myriad of outstanding features. [GitHub Actions](https://github.com/features/actions), in-house CI/CD, a marketplace, the [integration of npm](https://github.blog/2020-03-16-npm-is-joining-github/), et al. In fact, **GitHub is so powerful nowadays that it can be your all-in-all provider**. You can use **GitHub as a Service**. GaaS, Gaas, Gaas!

![Gas Gas Gas car](gasgasgas.jpeg)

## What is GaaS?

GitHub's variety of products is extensive enough to power most of the web apps out there. Don't believe me? Let's go through my journey building [Request For Maintainers](https://rfm.sospedra.me/) (RFM).

This project is a community-driven platform to track any repository calling for support. From the product point of view, I want to help the community to have a clean record of the OSS status. On the tech side, this project is an experiment I got in my mind for so long. **RFM runs 100% on GitHub services**. And it's [open-sourced](https://github.com/sospedra/rfm) so anyone is welcome to check the nuts and bolts.

If you want to build a web app that runs on GitHub you're gonna need some foundations. Basic things that are common to any web. But, before getting started, a disclaimer. I didn't read the terms and conditions and all the legal dullness. But I can sense this approach ~~maybe~~ exceeds the intended purposes.

- **Hosting**: for what **GitHub repositories** excel. But wait, there's more! [GitHub pages](https://pages.github.com/) put your web under a CDN, with SSL certs, and all the other goodies you'll expect from your trusted provider.

- **Database**: if you don't have anything to hide 🌝 then **GitHub Issues is a wonderful database**. For example, you can store a stringified JSON in the body. Or benefit from the Issue metadata.

- **Server**: most of the heavy lifting will happen in the client. But sometimes you need some special functions to run on the cloud. Did anyone say **serverless**? 💊

- **Auth**: Do you need to put some access restrictions? Well, GitHub has a top-notch [OAuth service](https://developer.github.com/apps/building-oauth-apps/) implemented.

## How does it work?

At this point, I guess you get the idea. But how we put together all the pieces? Let's see how I built RFM step by step. You'll see it's not that complex at all.

1. You need your web to be **statically generated**. There are tones of options: `Jekyll`, `create-react-app`, an old-fashion raw `HTML`. Whatever. The important bit is that to use GitHub pages it must be **static**.

2. You consume your fancy database with the public [GitHub API](https://developer.github.com/v3/). The public part is a no key-required standard CRUD. Your web app will **use this API to get GitHub Issues**.

3. When in need of **server functions use GitHub Actions**. These deliver an outstanding experience. They are so powerful. The basic idea is that a custom trigger will execute a custom function. There's a [marketplace](https://github.com/marketplace) you can explore or [you can build your own](https://help.github.com/en/actions/building-actions). It's free real state!

4. Finally, tweak the limitations. You can either add some auth with the GitHub OAuth. Or play with the Issues metadata, Actions triggers, etc. In RFM the actions are **executed only when the issue has a particular label**. Only moderators can assign labels. That's the way I avoid RFM being a spammy tool.

## Conclusion

Am I suggesting that y'all should use **GaaS** from now on? Well, absolutely no 🤷🏻‍♂️. But, there are some cases where this can be beneficial. I'm thinking of OSS projects, mostly. In fact, using [GitHub Issues as blog post comments](https://utteranc.es/) it's being a common practice for a long time. This is an evolution of the same concept. The actual point is: **GitHub is damn freaking powerful**. Let's give these people the love they deserve 👏💜
