import React from 'react'
import unified from 'unified'
import parse from 'rehype-parse'
import rehype2react from 'rehype-react'
import { Post } from 'service/api'
import Image from './Image'
import markdownCSS from './markdown.module.css'

type HASTProps = { children: React.ReactNode }

const clean = (props: HASTProps) => {
  return React.Children.toArray(props.children).filter((child) => {
    return typeof child === 'string' ? !!child.trim() : true
  })
}

const Content: React.FC<{ post: Post }> = ({ post }) => {
  return (
    <div className={`${markdownCSS['markdown']} mb-8`}>
      {
        ((unified()
          .use(parse)
          .use(rehype2react, {
            createElement: React.createElement,
            Fragment: React.Fragment,
            components: {
              head: React.Fragment,
              html: React.Fragment,
              body: React.Fragment,
              tr: (props: HASTProps) => <tr>{clean(props)}</tr>,
              th: (props: HASTProps) => <th>{clean(props)}</th>,
              td: (props: HASTProps) => <td>{clean(props)}</td>,
              table: (props: HASTProps) => <table>{clean(props)}</table>,
              tbody: (props: HASTProps) => <tbody>{clean(props)}</tbody>,
              thead: (props: HASTProps) => <thead>{clean(props)}</thead>,
              img: (props: any) => (
                <Image slug={post.slug} meta={post.metadata} {...props} />
              ),
            },
          })
          .processSync(post.content) as unknown) as {
          result: React.ReactNode
        }).result
      }
    </div>
  )
}

export default Content
