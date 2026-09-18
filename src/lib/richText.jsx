import React from 'react'

const urlRe = /https?:\/\/[^\s)]+/g
const mdLinkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g

function renderLine(line, key) {
  const chunks = []
  let cursor = 0
  const matches = [...line.matchAll(mdLinkRe)]
  if (matches.length) {
    matches.forEach((m, idx) => {
      const start = m.index ?? 0
      if (start > cursor) chunks.push(<React.Fragment key={`${key}-t-${idx}`}>{line.slice(cursor, start)}</React.Fragment>)
      chunks.push(<a key={`${key}-a-${idx}`} href={m[2]} target="_blank" rel="noreferrer">{m[1]}</a>)
      cursor = start + m[0].length
    })
    if (cursor < line.length) chunks.push(<React.Fragment key={`${key}-tail`}>{line.slice(cursor)}</React.Fragment>)
    return chunks
  }

  const pieces = line.split(urlRe)
  const urls = line.match(urlRe) || []
  pieces.forEach((piece, idx) => {
    chunks.push(<React.Fragment key={`${key}-p-${idx}`}>{piece}</React.Fragment>)
    if (urls[idx]) chunks.push(<a key={`${key}-u-${idx}`} href={urls[idx]} target="_blank" rel="noreferrer">{urls[idx]}</a>)
  })
  return chunks
}

export default function RichText({ text = '' }) {
  return <div className="rich-text">{String(text).split('\n').map((line, idx) => <p key={idx}>{renderLine(line, idx)}</p>)}</div>
}
